"""
Field Attendance Tracker Application Initialization

This file initializes the Flask application, registers blueprints,
sets up database connections, and configures the application.
"""

import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, g, redirect, render_template, request, session, url_for, flash
from flask.cli import with_appcontext
import click
import json
from werkzeug.security import check_password_hash, generate_password_hash

def create_app(test_config=None):
    """Create and configure the Flask application."""
    # Create the Flask app
    app = Flask(__name__, instance_relative_config=True)
    
    # Set default configuration
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev'),
        DATABASE=os.path.join(app.instance_path, 'attendance.db'),
        UPLOAD_FOLDER=os.path.join(app.instance_path, 'uploads'),
        ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg', 'gif'},
        MAX_CONTENT_LENGTH=16 * 1024 * 1024,  # 16 MB max upload
        SESSION_COOKIE_SECURE=os.environ.get('FLASK_ENV') != 'development',
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
        PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    )
    
    # Override with test config if provided
    if test_config is not None:
        app.config.from_mapping(test_config)
    
    # Override with instance config if available
    app.config.from_pyfile('config.py', silent=True)
    
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path, exist_ok=True)
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    except OSError:
        pass
    
    # Register database functions
    app.teardown_appcontext(close_db)
    app.cli.add_command(init_db_command)
    
    # Register core routes
    @app.route('/')
    def index():
        """Main page with clock in/out form or redirect to login."""
        if g.user is None:
            return redirect('/login')
        
        projects = get_projects()
        return render_template('index.html', projects=projects)
    
    @app.route('/admin')
    def admin_redirect():
        """Redirect to admin dashboard."""
        return redirect('/admin/dashboard')
    
    @app.route('/admin/dashboard')
    def admin_dashboard():
        """Admin dashboard to view attendance records."""
        if g.user is None or g.user['role'] not in ['admin', 'hr']:
            flash('You do not have permission to access this page.', 'danger')
            return redirect('/')
        
        # Get recent attendance records
        db = get_db()
        db.row_factory = sqlite3.Row
        cursor = db.cursor()
        
        # Query for recent attendance
        cursor.execute('''
            SELECT a.*, p.name as project_name, u.username as created_by_username 
            FROM attendance a
            LEFT JOIN projects p ON a.project_id = p.id
            LEFT JOIN users u ON a.created_by = u.id
            ORDER BY a.created_at DESC LIMIT 10
        ''')
        recent_attendance = cursor.fetchall()
        
        # Query for attendance stats
        cursor.execute('''
            SELECT COUNT(*) as total_records,
                   COUNT(DISTINCT employee_id) as total_employees,
                   COUNT(DISTINCT project_id) as total_projects,
                   SUBSTR(MAX(created_at), 1, 10) as latest_date
            FROM attendance
        ''')
        stats = cursor.fetchone()
        
        # Query for recent errors
        cursor.execute('''
            SELECT * FROM error_logs
            WHERE resolved = 0
            ORDER BY created_at DESC LIMIT 5
        ''')
        recent_errors = cursor.fetchall()
        
        return render_template(
            'admin_dashboard.html',
            recent_attendance=recent_attendance,
            stats=stats,
            recent_errors=recent_errors
        )
    
    # Register utility functions with app context
    @app.context_processor
    def inject_globals():
        return {
            'get_menu_items': get_menu_items,
            'current_year': datetime.now().year,
            'app_name': 'Field Attendance Tracker'
        }
    
    # Register error handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('error.html', error='Page not found', error_id=None), 404
    
    @app.errorhandler(403)
    def forbidden(e):
        return render_template('error.html', error='Access forbidden', error_id=None), 403
    
    @app.errorhandler(500)
    def server_error(e):
        return render_template('error.html', error='Internal server error', error_id=None), 500
    
    return app

def get_db():
    """Connect to the database."""
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
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
    
    with current_app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf8'))

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Clear the existing data and create new tables."""
    init_db()
    click.echo('Initialized the database.')

def get_projects():
    """Get all active projects from database."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM projects WHERE active = 1 ORDER BY name')
    return cursor.fetchall()

def get_menu_items(role=None):
    """Get menu items visible to the specified role."""
    try:
        db = get_db()
        cursor = db.cursor()
        
        # First check if the menu_items table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='menu_items'")
        if not cursor.fetchone():
            # Default menu items if table doesn't exist
            return [
                {'id': 1, 'name': 'Dashboard', 'url': '/admin/dashboard', 'icon': 'bi-speedometer2', 'order': 1, 'roles': 'admin,hr,viewer'},
                {'id': 2, 'name': 'Clock In/Out', 'url': '/', 'icon': 'bi-clock', 'order': 2, 'roles': 'admin,hr,viewer'},
                {'id': 3, 'name': 'Projects', 'url': '/admin/projects', 'icon': 'bi-briefcase', 'order': 3, 'roles': 'admin,hr'},
                {'id': 4, 'name': 'Users', 'url': '/auth/users', 'icon': 'bi-people', 'order': 4, 'roles': 'admin'},
                {'id': 5, 'name': 'Error Logs', 'url': '/errors/', 'icon': 'bi-exclamation-triangle', 'order': 5, 'roles': 'admin,hr'},
            ]
            
        # Get menu items from database
        if role:
            cursor.execute(
                'SELECT * FROM menu_items WHERE roles LIKE ? ORDER BY `order`',
                (f'%{role}%',)
            )
        else:
            cursor.execute('SELECT * FROM menu_items ORDER BY `order`')
            
        return cursor.fetchall()
    except Exception:
        # Fallback menu items in case of error
        return [
            {'id': 1, 'name': 'Dashboard', 'url': '/admin/dashboard', 'icon': 'bi-speedometer2', 'order': 1, 'roles': 'admin,hr,viewer'},
            {'id': 2, 'name': 'Clock In/Out', 'url': '/', 'icon': 'bi-clock', 'order': 2, 'roles': 'admin,hr,viewer'},
        ]

# Import necessary Flask components only when needed
from flask import current_app