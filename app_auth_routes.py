"""
Authentication and User Management Routes for Field Attendance Tracker
"""

import re
import functools
from datetime import datetime
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)
from werkzeug.security import check_password_hash, generate_password_hash
from .db import get_db

bp = Blueprint('auth', __name__, url_prefix='/auth')

def login_required(view):
    """View decorator that redirects anonymous users to the login page."""
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            return redirect(url_for('auth.login'))
        return view(**kwargs)
    return wrapped_view

def role_required(roles):
    """View decorator that requires specific role(s) for access."""
    def decorator(view):
        @functools.wraps(view)
        def wrapped_view(**kwargs):
            if g.user is None:
                return redirect(url_for('auth.login'))
            
            # If roles is a string, convert to list
            role_list = [roles] if isinstance(roles, str) else roles
            
            if g.user['role'] not in role_list:
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
        g.user = get_db().execute(
            'SELECT * FROM users WHERE id = ?', (user_id,)
        ).fetchone()
        
        # Update last_login timestamp for analytics
        if g.user:
            db = get_db()
            db.execute(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                (user_id,)
            )
            db.commit()

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
        
        db = get_db()
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
        role = request.form['role']
        
        db = get_db()
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
            log_message = f"New user registered: {username} (Role: {role})"
            db.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
                (g.user['id'] if g.user else None, 'user_register', log_message)
            )
            db.commit()
            
            # Redirect to login page with success message
            return redirect(url_for('auth.login', registration_success='true'))

        flash(error, 'danger')

    return render_template('login.html')

@bp.route('/logout')
def logout():
    """Clear the current session, including the stored user id."""
    session.clear()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('auth.login'))

# User Management Routes
@bp.route('/users')
@login_required
@role_required('admin')
def users():
    """Display all users."""
    db = get_db()
    users = db.execute('SELECT * FROM users ORDER BY username').fetchall()
    return render_template('admin_users.html', users=users)

@bp.route('/users/add', methods=('GET', 'POST'))
@login_required
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
        db = get_db()
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
            
            flash(f'User {username} added successfully.', 'success')
            return redirect(url_for('auth.users'))
        
        flash(error, 'danger')
    
    return render_template('user_form.html')

@bp.route('/users/<int:user_id>/edit', methods=('GET', 'POST'))
@login_required
@role_required('admin')
def edit_user(user_id):
    """Edit an existing user."""
    db = get_db()
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
            # Update user
            if password:
                hashed_password = generate_password_hash(password)
                db.execute(
                    'UPDATE users SET username = ?, password = ?, email = ?, name = ?, role = ?, active = ? WHERE id = ?',
                    (username, hashed_password, email, name, role, active, user_id)
                )
            else:
                db.execute(
                    'UPDATE users SET username = ?, email = ?, name = ?, role = ?, active = ? WHERE id = ?',
                    (username, email, name, role, active, user_id)
                )
            db.commit()
            
            flash(f'User {username} updated successfully.', 'success')
            return redirect(url_for('auth.users'))
        
        flash(error, 'danger')
    
    return render_template('user_form.html', user=user)

@bp.route('/users/<int:user_id>/delete', methods=('POST',))
@login_required
@role_required('admin')
def delete_user(user_id):
    """Delete a user."""
    db = get_db()
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
        email = request.form['email']
        name = request.form['name']
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        db = get_db()
        error = None
        
        # If changing password, validate current password
        if current_password:
            if not check_password_hash(g.user['password'], current_password):
                error = 'Current password is incorrect.'
            elif not new_password:
                error = 'New password is required.'
            elif new_password != confirm_password:
                error = 'Passwords do not match.'
            elif len(new_password) < 8:
                error = 'Password must be at least 8 characters long.'
        
        if error is None:
            if new_password:
                hashed_password = generate_password_hash(new_password)
                db.execute(
                    'UPDATE users SET email = ?, name = ?, password = ? WHERE id = ?',
                    (email, name, hashed_password, g.user['id'])
                )
            else:
                db.execute(
                    'UPDATE users SET email = ?, name = ? WHERE id = ?',
                    (email, name, g.user['id'])
                )
            db.commit()
            
            flash('Profile updated successfully.', 'success')
            return redirect(url_for('auth.profile'))
        
        flash(error, 'danger')
    
    return render_template('profile.html')

# API Routes for Authentication
@bp.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for user login."""
    if not request.is_json:
        return jsonify({'success': False, 'message': 'Missing JSON in request'}), 400
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'message': 'Missing username or password'}), 400
    
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if user is None or not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    
    if user['active'] == 0:
        return jsonify({'success': False, 'message': 'Account is disabled'}), 403
    
    # Create session
    session.clear()
    session['user_id'] = user['id']
    
    # Return user info (exclude password)
    return jsonify({
        'success': True, 
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role']
        }
    })

@bp.route('/api/logout', methods=['POST'])
def api_logout():
    """API endpoint for user logout."""
    session.clear()
    return jsonify({'success': True})

@bp.route('/api/user', methods=['GET'])
def api_user():
    """API endpoint to get current user info."""
    if g.user is None:
        return jsonify({'success': False, 'message': 'Not logged in'}), 401
    
    return jsonify({
        'success': True, 
        'user': {
            'id': g.user['id'],
            'username': g.user['username'],
            'email': g.user['email'],
            'name': g.user['name'],
            'role': g.user['role']
        }
    })

@bp.route('/api/users', methods=['GET'])
@login_required
@role_required(['admin', 'hr'])
def api_users():
    """API endpoint to get all users."""
    db = get_db()
    users_db = db.execute('SELECT id, username, email, name, role, active, created_at, last_login FROM users ORDER BY username').fetchall()
    
    users = []
    for user in users_db:
        users.append({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'active': user['active'],
            'created_at': user['created_at'],
            'last_login': user['last_login']
        })
    
    return jsonify({'success': True, 'users': users})