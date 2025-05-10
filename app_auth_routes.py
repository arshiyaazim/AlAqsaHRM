"""
Authentication and User Management Routes for Field Attendance Tracker
"""

import functools
import sqlite3
import secrets
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from flask import (
    Blueprint, flash, g, redirect, render_template, request, session, url_for, jsonify
)
from werkzeug.security import check_password_hash, generate_password_hash

bp = Blueprint('auth', __name__, url_prefix='/auth')

def login_required(view):
    """View decorator that redirects anonymous users to the login page."""
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if g.user is None:
            # Always use app-level login route
            return redirect('/login')
        return view(**kwargs)
    return wrapped_view

def role_required(roles):
    """View decorator that requires specific role(s) for access."""
    def decorator(view):
        @functools.wraps(view)
        def wrapped_view(**kwargs):
            if g.user is None:
                # Always use app-level login route
                return redirect('/login')
            
            if isinstance(roles, str):
                role_list = [roles]
            else:
                role_list = roles
                
            if g.user['role'] not in role_list:
                flash('You do not have permission to access this page.', 'danger')
                return redirect('/')
            
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
        db = sqlite3.connect('instance/attendance.db')
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        cursor.execute(
            'SELECT * FROM users WHERE id = ?', (user_id,)
        )
        g.user = cursor.fetchone()
        db.close()
        
        # Update last login time if it hasn't been updated recently
        if g.user:
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            db = sqlite3.connect('instance/attendance.db')
            cursor = db.cursor()
            cursor.execute(
                'UPDATE users SET last_login = ? WHERE id = ?',
                (current_time, user_id)
            )
            db.commit()
            db.close()

@bp.route('/login', methods=('GET', 'POST'))
def login():
    """Log in a registered user by adding the user id to the session."""
    if g.user:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember_me = 'remember_me' in request.form
        
        db = sqlite3.connect('instance/attendance.db')
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        error = None
        
        cursor.execute(
            'SELECT * FROM users WHERE username = ?', (username,)
        )
        user = cursor.fetchone()
        
        if user is None:
            error = 'Incorrect username or password.'
        elif not check_password_hash(user['password'], password):
            error = 'Incorrect username or password.'
        elif not user['active']:
            error = 'Your account has been deactivated. Please contact an administrator.'
            
        if error is None:
            # Store the user id in a cookie and clear the session
            session.clear()
            session['user_id'] = user['id']
            
            if remember_me:
                # Set session to permanent and extend lifetime (30 days)
                session.permanent = True
            
            # Log the successful login
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
                (user['id'], 'login', f"User {username} logged in", current_time)
            )
            db.commit()
            
            # Redirect to correct page based on user role - using direct paths
            if user['role'] == 'admin' or user['role'] == 'hr':
                return redirect('/admin/dashboard')
            else:
                return redirect('/')
                
        flash(error, 'danger')
        db.close()
        
    return render_template('login.html')

@bp.route('/register', methods=('GET', 'POST'))
def register():
    """Register a new user."""
    if g.user and g.user['role'] != 'admin':
        return redirect('/')
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        email = request.form['email']
        name = request.form['name']
        role = request.form.get('role', 'viewer')
        confirm_password = request.form.get('confirm_password')
        
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        error = None
        
        if not username:
            error = 'Username is required.'
        elif not password:
            error = 'Password is required.'
        elif not email:
            error = 'Email is required.'
        elif not name:
            error = 'Name is required.'
        elif password != confirm_password:
            error = 'Passwords do not match.'
        elif len(password) < 8:
            error = 'Password must be at least 8 characters long.'
        
        # Only allow admins to create non-viewer users
        if role != 'viewer' and (g.user is None or g.user['role'] != 'admin'):
            role = 'viewer'
            
        if error is None:
            try:
                # Check if user exists
                cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
                if cursor.fetchone() is not None:
                    error = f"User {username} is already registered."
                else:
                    # Create the user
                    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    cursor.execute(
                        'INSERT INTO users (username, password, email, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                        (username, generate_password_hash(password), email, name, role, current_time)
                    )
                    
                    # Log the registration
                    user_id = cursor.lastrowid
                    cursor.execute(
                        'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
                        (g.user['id'] if g.user else None, 'registration', f"User {username} was registered", current_time)
                    )
                    db.commit()
                    
                    # If registered by admin, redirect to users page
                    if g.user and g.user['role'] == 'admin':
                        flash(f"User {username} was successfully registered.", 'success')
                        return redirect('/auth/users')
                    
                    # Otherwise, redirect to login page
                    flash(f"Registration successful. You can now log in.", 'success')
                    return redirect('/login')
            except db.IntegrityError:
                error = f"User {username} is already registered."
            finally:
                db.close()
                
        flash(error, 'danger')
        
    return render_template('register.html')

@bp.route('/logout')
def logout():
    """Clear the current session, including the stored user id."""
    # Log the logout
    if g.user:
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
            (g.user['id'], 'logout', f"User {g.user['username']} logged out", current_time)
        )
        db.commit()
        db.close()
    
    session.clear()
    flash('You have been logged out.', 'info')
    # Always use direct path for reliability
    return redirect('/login')

@bp.route('/forgot-password', methods=('GET', 'POST'))
def forgot_password():
    """Handle forgot password requests."""
    if g.user:
        # Always use direct path
        return redirect('/')
        
    if request.method == 'POST':
        email = request.form['email']
        
        db = sqlite3.connect('instance/attendance.db')
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        
        # Find user with this email
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if user:
            # Check if there's a valid code already
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                '''SELECT * FROM password_reset_codes 
                   WHERE email = ? AND expires_at > ? AND used = 0
                   ORDER BY created_at DESC LIMIT 1''',
                (email, current_time)
            )
            existing_code = cursor.fetchone()
            
            if existing_code:
                # Use existing code
                code = existing_code['code']
                expires_at = existing_code['expires_at']
            else:
                # Generate new code
                code = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
                expires_at = (datetime.now() + timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
                
                # Store the code
                cursor.execute(
                    'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
                    (email, code, expires_at)
                )
                db.commit()
            
            # Send the code to the company email address (asls.guards@gmail.com)
            try:
                send_reset_email(email, code, user['username'])
                flash('A password reset code has been sent. Check with the company admin for the code.', 'info')
                
                # Log the password reset request
                cursor.execute(
                    'INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)',
                    ('password_reset_request', f"Password reset requested for {email}", current_time)
                )
                db.commit()
                
                # Redirect to enter code page using direct path
                return redirect('/auth/reset-password')
            except Exception as e:
                flash(f'Error sending reset code. Please contact an administrator.', 'danger')
        else:
            # For security reasons, still show the success message even if email doesn't exist
            flash('If the email exists in our system, a password reset code has been sent.', 'info')
        
        db.close()
        
    return render_template('forgot_password.html')

@bp.route('/reset-password', methods=('GET', 'POST'))
def reset_password():
    """Reset password using a code."""
    if g.user:
        # Always use direct path
        return redirect('/')
        
    if request.method == 'POST':
        code = request.form['code']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        db = sqlite3.connect('instance/attendance.db')
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        error = None
        
        if not code:
            error = 'Reset code is required.'
        elif not password:
            error = 'Password is required.'
        elif password != confirm_password:
            error = 'Passwords do not match.'
        elif len(password) < 8:
            error = 'Password must be at least 8 characters long.'
            
        if error is None:
            # Verify the code
            current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                '''SELECT * FROM password_reset_codes 
                   WHERE code = ? AND expires_at > ? AND used = 0''',
                (code, current_time)
            )
            reset_code = cursor.fetchone()
            
            if reset_code:
                # Update the user's password
                cursor.execute(
                    'UPDATE users SET password = ? WHERE email = ?',
                    (generate_password_hash(password), reset_code['email'])
                )
                
                # Mark the code as used
                cursor.execute(
                    'UPDATE password_reset_codes SET used = 1 WHERE id = ?',
                    (reset_code['id'],)
                )
                
                # Log the password reset
                cursor.execute(
                    'INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)',
                    ('password_reset', f"Password reset completed for {reset_code['email']}", current_time)
                )
                db.commit()
                
                # Expire all other codes for this email
                cursor.execute(
                    'UPDATE password_reset_codes SET used = 1 WHERE email = ? AND id != ?',
                    (reset_code['email'], reset_code['id'])
                )
                db.commit()
                
                flash('Your password has been reset. You can now login with your new password.', 'success')
                return redirect('/login')
            else:
                error = 'Invalid or expired reset code.'
                
        flash(error, 'danger')
        db.close()
        
    return render_template('reset_password.html')

@bp.route('/users')
@login_required
@role_required('admin')
def users():
    """Display all users."""
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    cursor.execute('SELECT * FROM users ORDER BY id')
    users = cursor.fetchall()
    db.close()
    
    return render_template('admin_users.html', users=users)

@bp.route('/users/add', methods=('GET', 'POST'))
@login_required
@role_required('admin')
def add_user():
    """Add a new user."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        email = request.form['email']
        name = request.form['name']
        role = request.form['role']
        active = 'active' in request.form
        
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        error = None
        
        if not username:
            error = 'Username is required.'
        elif not password:
            error = 'Password is required.'
        elif not email:
            error = 'Email is required.'
        elif not name:
            error = 'Name is required.'
        elif not role:
            error = 'Role is required.'
            
        if error is None:
            try:
                # Check if user exists
                cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
                if cursor.fetchone() is not None:
                    error = f"User {username} is already registered."
                else:
                    # Create the user
                    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    cursor.execute(
                        'INSERT INTO users (username, password, email, name, role, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        (username, generate_password_hash(password), email, name, role, 1 if active else 0, current_time)
                    )
                    
                    # Log the user creation
                    user_id = cursor.lastrowid
                    cursor.execute(
                        'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
                        (g.user['id'], 'create_user', f"User {username} was created by {g.user['username']}", current_time)
                    )
                    db.commit()
                    
                    flash(f"User {username} was successfully created.", 'success')
                    return redirect('/auth/users')
            except db.IntegrityError:
                error = f"User {username} is already registered."
            finally:
                db.close()
                
        flash(error, 'danger')
        
    return render_template('user_form.html', user={}, title='Add New User')

@bp.route('/users/<int:user_id>/edit', methods=('GET', 'POST'))
@login_required
@role_required('admin')
def edit_user(user_id):
    """Edit an existing user."""
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if user is None:
        db.close()
        flash('User not found.', 'danger')
        return redirect(url_for('auth.users'))
        
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        name = request.form['name']
        role = request.form['role']
        active = 'active' in request.form
        password = request.form.get('password')
        
        error = None
        
        if not username:
            error = 'Username is required.'
        elif not email:
            error = 'Email is required.'
        elif not name:
            error = 'Name is required.'
        elif not role:
            error = 'Role is required.'
            
        if error is None:
            try:
                # Check if username is taken by another user
                cursor.execute('SELECT id FROM users WHERE username = ? AND id != ?', (username, user_id))
                if cursor.fetchone() is not None:
                    error = f"Username {username} is already taken."
                else:
                    # Update the user
                    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    
                    if password:
                        # Update with new password
                        cursor.execute(
                            'UPDATE users SET username = ?, email = ?, name = ?, role = ?, active = ?, updated_at = ?, password = ? WHERE id = ?',
                            (username, email, name, role, 1 if active else 0, current_time, generate_password_hash(password), user_id)
                        )
                    else:
                        # Update without changing password
                        cursor.execute(
                            'UPDATE users SET username = ?, email = ?, name = ?, role = ?, active = ?, updated_at = ? WHERE id = ?',
                            (username, email, name, role, 1 if active else 0, current_time, user_id)
                        )
                    
                    # Log the user update
                    cursor.execute(
                        'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
                        (g.user['id'], 'update_user', f"User {username} was updated by {g.user['username']}", current_time)
                    )
                    db.commit()
                    
                    flash(f"User {username} was successfully updated.", 'success')
                    return redirect('/auth/users')
            except db.Error as e:
                error = f"Error updating user: {e}"
            finally:
                db.close()
                
        flash(error, 'danger')
    else:
        db.close()
        
    return render_template('user_form.html', user=user, title='Edit User')

@bp.route('/users/<int:user_id>/delete', methods=('POST',))
@login_required
@role_required('admin')
def delete_user(user_id):
    """Delete a user."""
    # Don't allow deleting your own account
    if user_id == g.user['id']:
        flash('You cannot delete your own account.', 'danger')
        return redirect('/auth/users')
        
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    
    if user is None:
        db.close()
        flash('User not found.', 'danger')
        return redirect(url_for('auth.users'))
        
    # Prevent deleting the last admin user
    if user['role'] == 'admin':
        cursor.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ('admin',))
        admin_count = cursor.fetchone()['count']
        if admin_count <= 1:
            db.close()
            flash('Cannot delete the last admin user.', 'danger')
            return redirect(url_for('auth.users'))
    
    try:
        # Delete the user
        username = user['username']
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        # Log the user deletion
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
            (g.user['id'], 'delete_user', f"User {username} was deleted by {g.user['username']}", current_time)
        )
        db.commit()
        
        flash(f"User {username} was successfully deleted.", 'success')
    except db.Error as e:
        flash(f"Error deleting user: {e}", 'danger')
    finally:
        db.close()
        
    return redirect(url_for('auth.users'))

@bp.route('/profile', methods=('GET', 'POST'))
@login_required
def profile():
    """View and edit user profile."""
    if request.method == 'POST':
        name = request.form['name']
        email = request.form['email']
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        error = None
        
        if not name:
            error = 'Name is required.'
        elif not email:
            error = 'Email is required.'
            
        # Check if changing password
        if current_password and new_password:
            # Verify current password
            cursor.execute('SELECT password FROM users WHERE id = ?', (g.user['id'],))
            stored_password = cursor.fetchone()[0]
            
            if not check_password_hash(stored_password, current_password):
                error = 'Current password is incorrect.'
            elif new_password != confirm_password:
                error = 'New passwords do not match.'
            elif len(new_password) < 8:
                error = 'New password must be at least 8 characters long.'
                
        if error is None:
            try:
                # Update basic profile information
                cursor.execute(
                    'UPDATE users SET name = ?, email = ? WHERE id = ?',
                    (name, email, g.user['id'])
                )
                
                # Update password if provided
                if current_password and new_password and confirm_password:
                    cursor.execute(
                        'UPDATE users SET password = ? WHERE id = ?',
                        (generate_password_hash(new_password), g.user['id'])
                    )
                
                # Log the profile update
                current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cursor.execute(
                    'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
                    (g.user['id'], 'update_profile', f"User {g.user['username']} updated their profile", current_time)
                )
                db.commit()
                
                flash('Your profile has been updated.', 'success')
                return redirect(url_for('auth.profile'))
            except db.Error as e:
                error = f"An error occurred: {e}"
            finally:
                db.close()
                
        flash(error, 'danger')
        
    return render_template('profile.html')

def send_reset_email(user_email, reset_code, username):
    """Send a password reset email to the company admin email."""
    company_email = 'asls.guards@gmail.com'  # Fixed email for the company
    
    # Create message
    message = MIMEMultipart()
    message['From'] = 'Field Attendance System <noreply@fieldattendance.com>'
    message['To'] = company_email
    message['Subject'] = 'Password Reset Request - Field Attendance Tracker'
    
    # Create email body with important details
    body = f"""
    <html>
    <body>
    <h2>Password Reset Request</h2>
    <p>A password reset has been requested for:</p>
    <ul>
        <li><strong>Username:</strong> {username}</li>
        <li><strong>Email:</strong> {user_email}</li>
    </ul>
    <p>The reset code is: <strong>{reset_code}</strong></p>
    <p>This code will expire in 15 minutes.</p>
    <p>Please provide this code to the user if the request is legitimate.</p>
    <p>If you did not authorize this request, please disregard this email.</p>
    <p>Thank you,<br>Field Attendance Tracker System</p>
    </body>
    </html>
    """
    
    # Attach HTML content
    message.attach(MIMEText(body, 'html'))
    
    # Connect to the SMTP server and send the email
    try:
        # For production, you would use:
        # with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        #     server.login(YOUR_EMAIL, YOUR_PASSWORD)
        #     server.send_message(message)
        
        # For development purposes, just log the email content
        print(f"==== PASSWORD RESET EMAIL ====")
        print(f"To: {company_email}")
        print(f"Subject: {message['Subject']}")
        print(f"Reset code for {username} ({user_email}): {reset_code}")
        print(f"============================")
        
        # In production, you'd uncomment the SMTP code and use real credentials
        # For now, we'll simulate the email being sent successfully
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        raise

# API endpoints for authentication
@bp.route('/api/login', methods=('POST',))
def api_login():
    """API endpoint for user login."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
        
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    
    if user is None or not check_password_hash(user['password'], password):
        db.close()
        return jsonify({"error": "Invalid username or password"}), 401
        
    if not user['active']:
        db.close()
        return jsonify({"error": "Account is deactivated"}), 403
        
    # Record login
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute(
        'UPDATE users SET last_login = ? WHERE id = ?',
        (current_time, user['id'])
    )
    
    cursor.execute(
        'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
        (user['id'], 'api_login', f"API login for user {username}", current_time)
    )
    db.commit()
    db.close()
    
    # Create session
    session.clear()
    session['user_id'] = user['id']
    
    return jsonify({
        "id": user['id'],
        "username": user['username'],
        "email": user['email'],
        "name": user['name'],
        "role": user['role']
    }), 200

@bp.route('/api/logout', methods=('POST',))
def api_logout():
    """API endpoint for user logout."""
    if g.user:
        db = sqlite3.connect('instance/attendance.db')
        cursor = db.cursor()
        
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            'INSERT INTO activity_logs (user_id, action, details, created_at) VALUES (?, ?, ?, ?)',
            (g.user['id'], 'api_logout', f"API logout for user {g.user['username']}", current_time)
        )
        db.commit()
        db.close()
    
    session.clear()
    return jsonify({"success": True}), 200

@bp.route('/api/user', methods=('GET',))
def api_user():
    """API endpoint to get current user info."""
    if g.user is None:
        return jsonify({"error": "Not authenticated"}), 401
        
    return jsonify({
        "id": g.user['id'],
        "username": g.user['username'],
        "email": g.user['email'],
        "name": g.user['name'],
        "role": g.user['role']
    }), 200

@bp.route('/api/users', methods=('GET',))
def api_users():
    """API endpoint to get all users."""
    if g.user is None or g.user['role'] != 'admin':
        return jsonify({"error": "Not authorized"}), 403
        
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    cursor.execute('SELECT id, username, email, name, role, active, created_at, last_login FROM users')
    users = cursor.fetchall()
    db.close()
    
    user_list = []
    for user in users:
        user_list.append({
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "name": user['name'],
            "role": user['role'],
            "active": bool(user['active']),
            "created_at": user['created_at'],
            "last_login": user['last_login']
        })
        
    return jsonify(user_list), 200

@bp.route('/api/forgot-password', methods=('POST',))
def api_forgot_password():
    """API endpoint for password reset requests."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    # Find user with this email
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    
    if user:
        # Generate new code
        code = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        expires_at = (datetime.now() + timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
        
        # Store the code
        cursor.execute(
            'INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, ?)',
            (email, code, expires_at)
        )
        
        # Log the password reset request
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            'INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)',
            ('password_reset_request', f"API password reset requested for {email}", current_time)
        )
        db.commit()
        
        # Send the reset code
        try:
            send_reset_email(email, code, user['username'])
            db.close()
            return jsonify({"success": True, "message": "Reset code sent successfully."}), 200
        except Exception as e:
            db.close()
            return jsonify({"error": str(e)}), 500
    
    # For security reasons, still return success even if email doesn't exist
    db.close()
    return jsonify({"success": True, "message": "If the email exists, a reset code has been sent."}), 200

@bp.route('/api/reset-password', methods=('POST',))
def api_reset_password():
    """API endpoint for resetting password with code."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
        
    data = request.get_json()
    code = data.get('code')
    password = data.get('password')
    
    if not code or not password:
        return jsonify({"error": "Code and password are required"}), 400
    
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long"}), 400
        
    db = sqlite3.connect('instance/attendance.db')
    db.row_factory = sqlite3.Row
    cursor = db.cursor()
    
    # Verify the code
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute(
        '''SELECT * FROM password_reset_codes 
           WHERE code = ? AND expires_at > ? AND used = 0''',
        (code, current_time)
    )
    reset_code = cursor.fetchone()
    
    if reset_code:
        # Update the user's password
        cursor.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            (generate_password_hash(password), reset_code['email'])
        )
        
        # Mark the code as used
        cursor.execute(
            'UPDATE password_reset_codes SET used = 1 WHERE id = ?',
            (reset_code['id'],)
        )
        
        # Log the password reset
        cursor.execute(
            'INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)',
            ('password_reset', f"API password reset completed for {reset_code['email']}", current_time)
        )
        
        # Expire all other codes for this email
        cursor.execute(
            'UPDATE password_reset_codes SET used = 1 WHERE email = ? AND id != ?',
            (reset_code['email'], reset_code['id'])
        )
        db.commit()
        db.close()
        
        return jsonify({"success": True, "message": "Password reset successful."}), 200
    else:
        db.close()
        return jsonify({"error": "Invalid or expired reset code."}), 400