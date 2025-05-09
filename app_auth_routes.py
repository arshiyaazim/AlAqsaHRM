"""
Authentication and User Management Routes for Field Attendance Tracker
"""

import functools
import re
from datetime import datetime

from flask import (
    Blueprint, flash, g, redirect, render_template, request,
    url_for, jsonify, current_app, session
)
from werkzeug.security import check_password_hash, generate_password_hash

# Create a blueprint
bp = Blueprint('auth', __name__, url_prefix='/auth')

def login_required(view):
    """View decorator that redirects anonymous users to the login page."""
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login', next=request.url))
        
        return view(**kwargs)
    
    return wrapped_view

def role_required(roles):
    """View decorator that requires specific role(s) for access."""
    def decorator(view):
        @functools.wraps(view)
        def wrapped_view(**kwargs):
            if g.user is None:
                flash('Please log in to access this page.', 'warning')
                return redirect(url_for('login', next=request.url))
            
            if isinstance(roles, str):
                allowed_roles = [roles]
            else:
                allowed_roles = roles
            
            if g.user['role'] not in allowed_roles:
                flash('You do not have permission to access this page.', 'danger')
                return redirect(url_for('index'))
            
            return view(**kwargs)
        return wrapped_view
    return decorator

@bp.before_app_request
def load_logged_in_user():
    """If a user id is stored in the session, load the user object from
    the database into ``g.user``."""
    user_id = session.get('user_id')
    
    if user_id is None:
        g.user = None
    else:
        try:
            db = current_app.extensions['get_db']()
            g.user = db.execute(
                'SELECT * FROM users WHERE id = ?', (user_id,)
            ).fetchone()
            
            # If user found, update last_login time
            if g.user:
                db.execute(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                    (user_id,)
                )
                db.commit()
        except Exception as e:
            # If there's an error, log it and reset the session
            current_app.logger.error(f"Error loading user: {e}")
            g.user = None
            session.clear()

@bp.route('/login', methods=('GET', 'POST'))
def login():
    """Log in a registered user by adding the user id to the session."""
    # If user is already logged in, redirect to appropriate page
    if g.user:
        if g.user['role'] == 'admin':
            return redirect(url_for('admin_dashboard'))
        else:
            return redirect(url_for('index'))
    
    registration_success = request.args.get('registration_success') == 'true'
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember_me = 'remember_me' in request.form
        
        db = current_app.extensions['get_db']()
        error = None
        user = db.execute(
            'SELECT * FROM users WHERE username = ?', (username,)
        ).fetchone()

        if user is None:
            error = 'Incorrect username or password.'
        elif not check_password_hash(user['password'], password):
            error = 'Incorrect username or password.'
        elif user['active'] == 0:
            error = 'This account has been deactivated.'

        if error is None:
            # Store the user id in a new session
            session.clear()
            session['user_id'] = user['id']
            
            # Set session timeout (30 days if remember me, 12 hours otherwise)
            if remember_me:
                session.permanent = True
            
            # Log this login
            db.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                (user['id'], 'login', f"User login: {username} (IP: {request.remote_addr})")
            )
            db.commit()
            
            # Redirect based on role
            if user['role'] == 'admin':
                return redirect(url_for('admin_dashboard'))
            elif user['role'] == 'hr':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('index'))

        flash(error, 'danger')

    return render_template('login.html', registration_success=registration_success)

@bp.route('/register', methods=('GET', 'POST'))
def register():
    """Register a new user."""
    # If user is already logged in, redirect to appropriate page
    if g.user:
        flash('You are already logged in.', 'info')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        name = request.form['name']
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        role = request.form.get('role', 'viewer')  # Default to viewer
        
        db = current_app.extensions['get_db']()
        error = None

        # Input validation
        if not username:
            error = 'Username is required.'
        elif not email:
            error = 'Email is required.'
        elif not password:
            error = 'Password is required.'
        elif password != confirm_password:
            error = 'Passwords do not match.'
        elif len(password) < 8:
            error = 'Password must be at least 8 characters long.'
        elif not re.search('[A-Z]', password):
            error = 'Password must contain at least one uppercase letter.'
        elif not re.search('[a-z]', password):
            error = 'Password must contain at least one lowercase letter.'
        elif not re.search('[0-9!@#$%^&*]', password):
            error = 'Password must contain at least one number or special character.'
        
        # Restrict role choices - don't allow admin unless user is admin
        if role not in ['viewer', 'hr', 'admin']:
            error = 'Invalid role selection.'
        
        if role == 'admin' and (g.user is None or g.user['role'] != 'admin'):
            # If not admin, force role to be viewer
            role = 'viewer'
        
        # Check for duplicate username or email
        if error is None:
            try:
                # Check if username already exists
                if db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone() is not None:
                    error = f"User {username} is already registered."
                
                # Check if email already exists
                elif db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone() is not None:
                    error = f"Email {email} is already registered."
                    
            except db.IntegrityError:
                error = "Registration failed. Please try again."

        if error is None:
            # Create the new user
            db.execute(
                'INSERT INTO users (username, password, email, name, role, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                (username, generate_password_hash(password), email, name, role)
            )
            db.commit()
            
            # Log this activity
            db.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                (g.user['id'] if g.user else None, 'user_register', f"New user registered: {username} (Role: {role})")
            )
            db.commit()
            
            # Redirect to login page with success message
            return redirect(url_for('login', registration_success='true'))

        flash(error, 'danger')

    return render_template('register.html')

@bp.route('/logout')
def logout():
    """Clear the current session, including the stored user id."""
    if g.user:
        # Log this logout
        db = current_app.extensions['get_db']()
        db.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            (g.user['id'], 'logout', f"User logout: {g.user['username']} (IP: {request.remote_addr})")
        )
        db.commit()
    
    session.clear()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('login'))

@bp.route('/users')
@role_required('admin')
def users():
    """Display all users."""
    db = current_app.extensions['get_db']()
    users = db.execute('SELECT * FROM users ORDER BY username').fetchall()
    
    return render_template('admin_users.html', users=users)

@bp.route('/users/add', methods=('GET', 'POST'))
@role_required('admin')
def add_user():
    """Add a new user."""
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        name = request.form['name']
        role = request.form['role']
        password = request.form['password']
        
        # Validate inputs
        db = current_app.extensions['get_db']()
        error = None
        
        if not username:
            error = 'Username is required.'
        elif not role:
            error = 'Role is required.'
        elif role not in ['admin', 'hr', 'viewer']:
            error = 'Invalid role.'
        elif not password:
            error = 'Password is required.'
        
        # Check if username or email already exists
        if error is None:
            if db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone():
                error = f"User {username} is already registered."
            elif email and db.execute('SELECT id FROM users WHERE email = ? AND email IS NOT NULL', (email,)).fetchone():
                error = f"Email {email} is already registered."
        
        if error is None:
            hashed_password = generate_password_hash(password)
            db.execute(
                'INSERT INTO users (username, password, email, name, role, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
                (username, hashed_password, email, name, role)
            )
            db.commit()
            
            # Log this activity
            db.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                (g.user['id'], 'user_add', f"Added user: {username} (Role: {role})")
            )
            db.commit()
            
            flash(f'User {username} added successfully.', 'success')
            return redirect(url_for('auth.users'))
        
        flash(error, 'danger')
    
    return render_template('user_form.html')

@bp.route('/users/<int:user_id>/edit', methods=('GET', 'POST'))
@role_required('admin')
def edit_user(user_id):
    """Edit an existing user."""
    db = current_app.extensions['get_db']()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('auth.users'))
    
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        name = request.form['name']
        role = request.form['role']
        password = request.form['password']
        active = 1 if 'active' in request.form else 0
        
        # Validate inputs
        error = None
        
        if not username:
            error = 'Username is required.'
        elif not role:
            error = 'Role is required.'
        elif role not in ['admin', 'hr', 'viewer']:
            error = 'Invalid role.'
        
        # Check if username already exists for other users
        if error is None:
            existing_user = db.execute(
                'SELECT id FROM users WHERE username = ? AND id != ?', 
                (username, user_id)
            ).fetchone()
            
            if existing_user:
                error = f"User {username} already exists."
            
            # Check if email already exists for other users
            if email:
                existing_email = db.execute(
                    'SELECT id FROM users WHERE email = ? AND id != ?', 
                    (email, user_id)
                ).fetchone()
                
                if existing_email:
                    error = f"Email {email} already exists."
        
        if error is None:
            # Prevent deactivating yourself
            if user_id == g.user['id'] and active == 0:
                active = 1
                flash('You cannot deactivate your own account.', 'warning')
            
            # Prevent deactivating the last admin
            if user['role'] == 'admin' and active == 0:
                admin_count = db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin" AND active = 1').fetchone()['count']
                if admin_count <= 1:
                    active = 1
                    flash('Cannot deactivate the last admin account.', 'danger')
            
            # Update user
            if password:
                hashed_password = generate_password_hash(password)
                db.execute(
                    'UPDATE users SET username = ?, password = ?, email = ?, name = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (username, hashed_password, email, name, role, active, user_id)
                )
            else:
                db.execute(
                    'UPDATE users SET username = ?, email = ?, name = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (username, email, name, role, active, user_id)
                )
            db.commit()
            
            # Log this activity
            db.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                (g.user['id'], 'user_edit', f"Updated user: {username} (Role: {role}, Active: {active})")
            )
            db.commit()
            
            flash(f'User {username} updated successfully.', 'success')
            return redirect(url_for('auth.users'))
        
        flash(error, 'danger')
    
    return render_template('user_form.html', user=user)

@bp.route('/users/<int:user_id>/delete', methods=('POST',))
@role_required('admin')
def delete_user(user_id):
    """Delete a user."""
    db = current_app.extensions['get_db']()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('auth.users'))
    
    # Prevent deleting yourself
    if user_id == g.user['id']:
        flash('You cannot delete your own account.', 'danger')
        return redirect(url_for('auth.users'))
    
    # Prevent deleting the last admin
    if user['role'] == 'admin':
        admin_count = db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"').fetchone()['count']
        if admin_count <= 1:
            flash('Cannot delete the last admin account.', 'danger')
            return redirect(url_for('auth.users'))
    
    # Log this activity before deleting the user
    db.execute(
        'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        (g.user['id'], 'user_delete', f"Deleted user: {user['username']} (Role: {user['role']})")
    )
    
    # Delete the user
    db.execute('DELETE FROM users WHERE id = ?', (user_id,))
    db.commit()
    
    flash(f'User {user["username"]} deleted successfully.', 'success')
    return redirect(url_for('auth.users'))

@bp.route('/profile', methods=('GET', 'POST'))
@login_required
def profile():
    """View and edit user profile."""
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        db = current_app.extensions['get_db']()
        error = None
        
        # Validate inputs
        if not name:
            error = 'Name is required.'
        elif not email:
            error = 'Email is required.'
        
        # Check if email already exists for other users
        if error is None and email:
            existing_email = db.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?', 
                (email, g.user['id'])
            ).fetchone()
            
            if existing_email:
                error = f"Email {email} is already registered to another account."
        
        # Password change validation
        if current_password:
            if not check_password_hash(g.user['password'], current_password):
                error = 'Current password is incorrect.'
            elif not new_password:
                error = 'New password is required.'
            elif new_password != confirm_password:
                error = 'New passwords do not match.'
            elif len(new_password) < 8:
                error = 'Password must be at least 8 characters long.'
            elif not re.search('[A-Z]', new_password):
                error = 'Password must contain at least one uppercase letter.'
            elif not re.search('[a-z]', new_password):
                error = 'Password must contain at least one lowercase letter.'
            elif not re.search('[0-9!@#$%^&*]', new_password):
                error = 'Password must contain at least one number or special character.'
        
        if error is None:
            # Update user profile
            if current_password and new_password:
                # Update with new password
                db.execute(
                    'UPDATE users SET name = ?, email = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (name, email, generate_password_hash(new_password), g.user['id'])
                )
            else:
                # Update without changing password
                db.execute(
                    'UPDATE users SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    (name, email, g.user['id'])
                )
            db.commit()
            
            # Log this activity
            db.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                (g.user['id'], 'profile_update', "User updated their profile")
            )
            db.commit()
            
            flash('Your profile has been updated successfully.', 'success')
            return redirect(url_for('auth.profile'))
        
        flash(error, 'danger')
    
    return render_template('profile.html')

# API routes
@bp.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for user login."""
    if not request.is_json:
        return jsonify({'success': False, 'message': 'Missing JSON in request'}), 400
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required'}), 400
    
    db = current_app.extensions['get_db']()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if user is None or not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    
    if user['active'] == 0:
        return jsonify({'success': False, 'message': 'This account has been deactivated'}), 401
    
    # Login successful
    session.clear()
    session['user_id'] = user['id']
    
    # Log this login
    db.execute(
        'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        (user['id'], 'api_login', f"API login: {username} (IP: {request.remote_addr})")
    )
    db.commit()
    
    # Return user data (excluding password)
    user_dict = dict(user)
    user_dict.pop('password', None)
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': user_dict
    })

@bp.route('/api/logout', methods=['POST'])
def api_logout():
    """API endpoint for user logout."""
    if g.user:
        # Log this logout
        db = current_app.extensions['get_db']()
        db.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            (g.user['id'], 'api_logout', f"API logout: {g.user['username']} (IP: {request.remote_addr})")
        )
        db.commit()
    
    session.clear()
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    })

@bp.route('/api/user', methods=['GET'])
def api_user():
    """API endpoint to get current user info."""
    if g.user is None:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    # Return user data (excluding password)
    user_dict = dict(g.user)
    user_dict.pop('password', None)
    
    return jsonify({
        'success': True,
        'user': user_dict
    })

@bp.route('/api/users', methods=['GET'])
@role_required(['admin', 'hr'])
def api_users():
    """API endpoint to get all users."""
    db = current_app.extensions['get_db']()
    
    # For HR users, only return non-admin users
    if g.user['role'] == 'hr':
        users = db.execute('SELECT id, username, email, name, role, active, created_at, last_login FROM users WHERE role != "admin" ORDER BY username').fetchall()
    else:
        users = db.execute('SELECT id, username, email, name, role, active, created_at, last_login FROM users ORDER BY username').fetchall()
    
    return jsonify({
        'success': True,
        'users': [dict(user) for user in users]
    })