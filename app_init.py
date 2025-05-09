"""
Field Attendance Tracker Application Initialization

This file initializes the Flask application, registers blueprints,
sets up database connections, and configures the application.
"""

import os
import re
import sqlite3
import logging
from datetime import datetime, timedelta

from flask import Flask, g, request, session, redirect, url_for, flash, render_template, jsonify
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('field_attendance')

def create_app(test_config=None):
    """Create and configure the Flask application."""
    app = Flask(__name__, instance_relative_config=True)
    
    # Apply middleware for handling proxy headers
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    
    # Load default configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        DATABASE=os.path.join(app.instance_path, 'attendance.db'),
        UPLOAD_FOLDER=os.path.join(app.root_path, 'uploads'),
        ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg', 'gif'},
        MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16 MB max upload
        SESSION_COOKIE_SECURE=os.environ.get('ENVIRONMENT') == 'production',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    )
    
    # Load test config if passed
    if test_config is not None:
        app.config.from_mapping(test_config)
    
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # Ensure the upload folder exists
    try:
        os.makedirs(app.config['UPLOAD_FOLDER'])
    except OSError:
        pass
    
    # Initialize database
    def get_db():
        """Connect to the database."""
        if 'db' not in g:
            g.db = sqlite3.connect(
                app.config['DATABASE'],
                detect_types=sqlite3.PARSE_DECLTYPES
            )
            g.db.row_factory = sqlite3.Row
        
        return g.db
    
    def close_db(e=None):
        """Close the database at the end of the request."""
        db = g.pop('db', None)
        
        if db is not None:
            db.close()
    
    def init_db():
        """Initialize the database."""
        db = get_db()
        
        with app.open_resource('schema.sql') as f:
            db.executescript(f.read().decode('utf8'))
    
    @app.cli.command('init-db')
    def init_db_command():
        """Clear the existing data and create new tables."""
        init_db()
        app.logger.info('Initialized the database.')
    
    # Register database functions with the Flask app
    app.teardown_appcontext(close_db)
    
    # Load blueprints
    # from . import auth
    # app.register_blueprint(auth.bp)
    
    # from . import errors
    # app.register_blueprint(errors.bp)
    
    # Apply error handling
    # errors.init_app(app)
    
    # User loader for session
    @app.before_request
    def load_logged_in_user():
        """Load the logged-in user from the session."""
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
    
    # Authentication routes
    @app.route('/login', methods=('GET', 'POST'))
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
    
    @app.route('/register', methods=('GET', 'POST'))
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
                return redirect(url_for('login', registration_success='true'))

            flash(error, 'danger')

        return render_template('login.html')
    
    @app.route('/logout')
    def logout():
        """Clear the current session, including the stored user id."""
        session.clear()
        flash('You have been logged out successfully.', 'success')
        return redirect(url_for('login'))
    
    # API route for user
    @app.route('/api/user', methods=['GET'])
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
    
    # Define the index route
    @app.route('/')
    def index():
        """Main page with clock in/out form or redirect to login."""
        if g.user is None:
            return redirect(url_for('login'))
        
        # If admin or HR, redirect to dashboard
        if g.user and g.user['role'] in ['admin', 'hr']:
            return redirect(url_for('admin_dashboard'))
        
        # Get projects for the form
        db = get_db()
        projects = db.execute('SELECT id, name FROM projects WHERE active = 1 ORDER BY name').fetchall()
        
        return render_template('index.html', projects=projects)
    
    # Admin routes
    @app.route('/admin')
    def admin_redirect():
        """Redirect to admin dashboard."""
        return redirect(url_for('admin_dashboard'))
    
    @app.route('/admin/dashboard')
    def admin_dashboard():
        """Admin dashboard to view attendance records."""
        if g.user is None or g.user['role'] not in ['admin', 'hr']:
            flash('You do not have permission to access the admin dashboard.', 'danger')
            return redirect(url_for('login'))
        
        # Get statistics for the dashboard
        db = get_db()
        
        # Total records
        total_records = db.execute('SELECT COUNT(*) as count FROM attendance').fetchone()['count']
        
        # Records today
        today = datetime.now().strftime('%Y-%m-%d')
        today_records = db.execute(
            'SELECT COUNT(*) as count FROM attendance WHERE DATE(created_at) = ?',
            (today,)
        ).fetchone()['count']
        
        # Active projects
        active_projects = db.execute('SELECT COUNT(*) as count FROM projects WHERE active = 1').fetchone()['count']
        
        # Users count
        users_count = db.execute('SELECT COUNT(*) as count FROM users').fetchone()['count']
        
        # Get recent attendance records
        recent_records = db.execute(
            'SELECT a.*, p.name as project_name FROM attendance a LEFT JOIN projects p ON a.project_id = p.id ORDER BY a.created_at DESC LIMIT 10'
        ).fetchall()
        
        # Error logs count
        error_logs_count = db.execute('SELECT COUNT(*) as count FROM error_logs WHERE resolved = 0').fetchone()['count']
        
        return render_template(
            'admin_dashboard.html',
            total_records=total_records,
            today_records=today_records,
            active_projects=active_projects,
            users_count=users_count,
            recent_records=recent_records,
            error_logs_count=error_logs_count
        )
    
    @app.route('/admin/users')
    def admin_users():
        """User management page."""
        if g.user is None or g.user['role'] != 'admin':
            flash('You do not have permission to access the user management page.', 'danger')
            return redirect(url_for('login'))
        
        db = get_db()
        users = db.execute('SELECT * FROM users ORDER BY username').fetchall()
        
        return render_template('admin_users.html', users=users)
    
    @app.route('/admin/users/add', methods=('GET', 'POST'))
    def add_user():
        """Add a new user."""
        if g.user is None or g.user['role'] != 'admin':
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
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
                return redirect(url_for('admin_users'))
            
            flash(error, 'danger')
        
        return render_template('user_form.html')
    
    @app.route('/admin/users/<int:user_id>/edit', methods=('GET', 'POST'))
    def edit_user(user_id):
        """Edit an existing user."""
        if g.user is None or g.user['role'] != 'admin':
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        
        if not user:
            flash('User not found.', 'danger')
            return redirect(url_for('admin_users'))
        
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
                return redirect(url_for('admin_users'))
            
            flash(error, 'danger')
        
        return render_template('user_form.html', user=user)
    
    @app.route('/admin/users/<int:user_id>/delete', methods=('POST',))
    def delete_user(user_id):
        """Delete a user."""
        if g.user is None or g.user['role'] != 'admin':
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        
        if not user:
            flash('User not found.', 'danger')
            return redirect(url_for('admin_users'))
        
        # Prevent deleting yourself
        if user_id == g.user['id']:
            flash('You cannot delete your own account.', 'danger')
            return redirect(url_for('admin_users'))
        
        # Prevent deleting the last admin
        if user['role'] == 'admin':
            admin_count = db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"').fetchone()['count']
            if admin_count <= 1:
                flash('Cannot delete the last admin account.', 'danger')
                return redirect(url_for('admin_users'))
        
        # Delete the user
        db.execute('DELETE FROM users WHERE id = ?', (user_id,))
        db.commit()
        
        flash(f'User {user["username"]} deleted successfully.', 'success')
        return redirect(url_for('admin_users'))
    
    @app.route('/admin/error-logs')
    def admin_error_logs():
        """Error logs management page."""
        if g.user is None or g.user['role'] not in ['admin', 'hr']:
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
        # Get query parameters for filtering
        error_type = request.args.get('error_type')
        resolved = request.args.get('resolved')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        page = int(request.args.get('page', 1))
        per_page = 20  # Number of logs per page
        
        db = get_db()
        
        # Build the query
        query = 'SELECT * FROM error_logs WHERE 1=1'
        query_params = []
        
        if error_type:
            query += ' AND error_type = ?'
            query_params.append(error_type)
        
        if resolved is not None:
            query += ' AND resolved = ?'
            query_params.append(int(resolved))
        
        if date_from:
            query += ' AND DATE(created_at) >= DATE(?)'
            query_params.append(date_from)
        
        if date_to:
            query += ' AND DATE(created_at) <= DATE(?)'
            query_params.append(date_to)
        
        # Count total matching records for pagination
        count_query = 'SELECT COUNT(*) as count FROM error_logs WHERE 1=1'
        if error_type:
            count_query += ' AND error_type = ?'
        if resolved is not None:
            count_query += ' AND resolved = ?'
        if date_from:
            count_query += ' AND DATE(created_at) >= DATE(?)'
        if date_to:
            count_query += ' AND DATE(created_at) <= DATE(?)'
        
        total_count = db.execute(count_query, query_params).fetchone()['count']
        total_pages = (total_count + per_page - 1) // per_page  # Ceiling division
        
        # Add pagination to the query
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
        query_params.extend([per_page, (page - 1) * per_page])
        
        # Execute the query
        error_logs = db.execute(query, query_params).fetchall()
        
        # Parse JSON in error_details field
        parsed_logs = []
        for log in error_logs:
            log_dict = dict(log)
            if log_dict['error_details']:
                try:
                    import json
                    log_dict['error_details'] = json.dumps(json.loads(log_dict['error_details']), indent=2)
                except:
                    # If not valid JSON, keep as is
                    pass
            parsed_logs.append(log_dict)
        
        return render_template(
            'admin_error_logs.html', 
            error_logs=parsed_logs, 
            page=page, 
            total_pages=total_pages
        )
    
    @app.route('/admin/error-logs/resolve/<int:error_id>', methods=['POST', 'GET'])
    def resolve_error(error_id):
        """Mark an error as resolved."""
        if g.user is None or g.user['role'] not in ['admin', 'hr']:
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
        db = get_db()
        
        # Check if the error exists
        error = db.execute('SELECT * FROM error_logs WHERE id = ?', (error_id,)).fetchone()
        if not error:
            flash('Error not found.', 'danger')
            return redirect(url_for('admin_error_logs'))
        
        # Get resolution notes if provided
        resolution_notes = request.form.get('resolution_notes', '')
        
        # Update the error
        db.execute(
            'UPDATE error_logs SET resolved = 1, resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
            (resolution_notes, error_id)
        )
        db.commit()
        
        flash('Error marked as resolved.', 'success')
        
        # Redirect back to the previous page or error logs page
        next_page = request.args.get('next') or url_for('admin_error_logs')
        return redirect(next_page)
    
    @app.route('/admin/error-logs/cleanup', methods=['POST'])
    def cleanup_error_logs():
        """Clean up old error logs."""
        if g.user is None or g.user['role'] != 'admin':
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
        cleanup_type = request.form.get('cleanup_type', 'resolved')
        older_than = int(request.form.get('older_than', 30))
        
        db = get_db()
        
        # Calculate the cutoff date
        cutoff_date = datetime.now() - timedelta(days=older_than)
        cutoff_str = cutoff_date.strftime('%Y-%m-%d %H:%M:%S')
        
        # Build the query
        if cleanup_type == 'resolved':
            query = 'DELETE FROM error_logs WHERE resolved = 1 AND created_at < ?'
            query_params = [cutoff_str]
        elif cleanup_type == 'all':
            query = 'DELETE FROM error_logs WHERE created_at < ?'
            query_params = [cutoff_str]
        else:
            flash('Invalid cleanup type.', 'danger')
            return redirect(url_for('admin_error_logs'))
        
        # Execute the query
        result = db.execute(query, query_params)
        db.commit()
        
        # Get number of affected rows
        affected_rows = db.total_changes
        
        flash(f'Cleaned up {affected_rows} error logs.', 'success')
        return redirect(url_for('admin_error_logs'))
    
    @app.route('/admin/error-logs/export')
    def export_error_logs():
        """Export error logs to Excel or CSV."""
        if g.user is None or g.user['role'] not in ['admin', 'hr']:
            flash('You do not have permission to access this page.', 'danger')
            return redirect(url_for('login'))
        
        format_type = request.args.get('format', 'excel')
        
        # Get query parameters for filtering
        error_type = request.args.get('error_type')
        resolved = request.args.get('resolved')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        db = get_db()
        
        # Build the query
        query = 'SELECT * FROM error_logs WHERE 1=1'
        query_params = []
        
        if error_type:
            query += ' AND error_type = ?'
            query_params.append(error_type)
        
        if resolved is not None:
            query += ' AND resolved = ?'
            query_params.append(int(resolved))
        
        if date_from:
            query += ' AND DATE(created_at) >= DATE(?)'
            query_params.append(date_from)
        
        if date_to:
            query += ' AND DATE(created_at) <= DATE(?)'
            query_params.append(date_to)
        
        query += ' ORDER BY created_at DESC'
        
        # Execute the query
        error_logs = db.execute(query, query_params).fetchall()
        
        if format_type == 'excel':
            # For now, just return a message
            flash('Excel export not implemented yet. Coming soon!', 'info')
            return redirect(url_for('admin_error_logs'))
        else:
            # For now, just return a message
            flash('CSV export not implemented yet. Coming soon!', 'info')
            return redirect(url_for('admin_error_logs'))
    
    @app.route('/api/sync/error-logs', methods=['POST'])
    def api_sync_errors():
        """API endpoint to sync error logs from client."""
        if not request.is_json:
            return jsonify({'success': False, 'message': 'Missing JSON in request'}), 400
        
        data = request.get_json()
        errors = data.get('errors', [])
        
        if not errors:
            return jsonify({'success': True, 'syncedCount': 0, 'message': 'No errors to sync'}), 200
        
        db = get_db()
        synced_ids = []
        
        for error in errors:
            # Extract error data
            error_type = error.get('errorType', 'unknown')
            error_message = error.get('message', 'No message provided')
            timestamp = error.get('timestamp')
            
            # Convert error details to JSON string
            import json
            error_details = {
                'deviceInfo': error.get('deviceInfo'),
                'url': error.get('url'),
                'timestamp': timestamp
            }
            
            # Add any extra data provided
            for key, value in error.items():
                if key not in ['errorType', 'message', 'deviceInfo', 'url', 'timestamp', 'id']:
                    error_details[key] = value
            
            # Insert the error into the database
            cursor = db.execute(
                'INSERT INTO error_logs (error_type, error_message, error_details, device_info, created_at) VALUES (?, ?, ?, ?, ?)',
                (
                    error_type, 
                    error_message, 
                    json.dumps(error_details), 
                    json.dumps(error.get('deviceInfo')), 
                    timestamp or datetime.now().isoformat()
                )
            )
            
            # Add the client-side ID to the list of synced IDs
            if 'id' in error:
                synced_ids.append(error['id'])
        
        db.commit()
        
        return jsonify({
            'success': True, 
            'syncedCount': len(errors),
            'syncedIds': synced_ids,
            'message': f'Successfully synced {len(errors)} error logs'
        })
    
    return app