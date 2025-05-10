"""
Al-Aqsa Security - Mobile Attendance Tracking Application
Flask-based web application with Progressive Web App (PWA) support
Enhanced with advanced features for admin management, offline access, and more
"""

import os
import sqlite3
import json
import datetime
import traceback
import logging
import functools
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from flask import (
    Flask, render_template, request, redirect, url_for, 
    flash, jsonify, session, g, send_from_directory, make_response, abort
)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
DATABASE = 'attendance.db'
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')  # For development only

# Create application
app = Flask(__name__)
app.config.from_mapping(
    SECRET_KEY=SECRET_KEY,
    UPLOAD_FOLDER=UPLOAD_FOLDER
)

# Set up logging
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(
    filename='logs/app.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database connection
def get_db():
    if 'db' not in g:
        try:
            g.db = sqlite3.connect(
                DATABASE,
                detect_types=sqlite3.PARSE_DECLTYPES
            )
            g.db.row_factory = sqlite3.Row
            # Enable foreign keys
            g.db.execute('PRAGMA foreign_keys = ON')
        except sqlite3.Error as e:
            log_error('database', f'Failed to connect to database: {str(e)}')
            raise
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    """Initialize the SQLite database with required tables."""
    db = get_db()
    with app.open_resource('schema.sql') as f:
        try:
            db.executescript(f.read().decode('utf8'))
        
            # Add admin user if not exists
            admin_exists = db.execute(
                'SELECT username FROM admins WHERE username = ?', (ADMIN_USERNAME,)
            ).fetchone()
            
            if not admin_exists:
                db.execute(
                    'INSERT INTO admins (username, password) VALUES (?, ?)',
                    (ADMIN_USERNAME, generate_password_hash(ADMIN_PASSWORD))
                )
                db.commit()
            
            # Log successful initialization
            logging.info("Database initialized successfully")
        except Exception as e:
            db.rollback()
            error_msg = f"Database initialization failed: {str(e)}"
            logging.error(error_msg)
            log_error('database', error_msg, traceback.format_exc())
            raise

@app.cli.command('init-db')
def init_db_command():
    """Clear existing data and create new tables."""
    init_db()
    print('Initialized the database.')

def allowed_file(filename):
    """Check if a file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def log_error(error_type, error_message, error_details=None):
    """Log error to database and file"""
    try:
        db = get_db()
        db.execute(
            'INSERT INTO error_logs (error_type, error_message, error_details) VALUES (?, ?, ?)',
            (error_type, error_message, error_details)
        )
        db.commit()
        logging.error(f"{error_type}: {error_message}")
        if error_details:
            logging.debug(error_details)
    except Exception as e:
        # If we can't log to DB, at least log to file
        logging.critical(f"Failed to log error to database: {str(e)}")
        logging.error(f"Original error - {error_type}: {error_message}")

def get_user_by_role(role=None):
    """Get users filtered by role if provided"""
    db = get_db()
    if role:
        return db.execute('SELECT * FROM users WHERE role = ?', (role,)).fetchall()
    else:
        return db.execute('SELECT * FROM users').fetchall()

def get_current_user():
    """Get the current logged in user"""
    if 'user_id' in session:
        db = get_db()
        return db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    return None

def role_required(roles):
    """Decorator to require specific role(s) for routes."""
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('user_id'):
                flash('Please log in to access this page.', 'warning')
                return redirect(url_for('admin_login'))
            
            user = get_current_user()
            if not user or user['role'] not in roles:
                flash(f'You need {" or ".join(roles)} privileges to access this page.', 'danger')
                return redirect(url_for('admin_login'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# For backward compatibility
def admin_required(f):
    """Decorator to require admin login for routes."""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in') and not session.get('user_id'):
            flash('Please log in as admin to access this page.', 'warning')
            return redirect(url_for('admin_login'))
        
        # Check if using new user system
        if session.get('user_id'):
            user = get_current_user()
            if not user or user['role'] != 'admin':
                flash('Admin privileges required.', 'danger')
                return redirect(url_for('admin_login'))
        
        return f(*args, **kwargs)
    return decorated_function

def get_menu_items(role=None):
    """Get menu items visible to the specified role"""
    db = get_db()
    
    # Check if menu_items table exists
    try:
        # Get parent menu items first (those with null parent_id)
        parents = db.execute(
            'SELECT * FROM menu_items WHERE parent_id IS NULL ORDER BY position'
        ).fetchall()
        
        result = []
        for parent in parents:
            # Check if this item is visible to the current role
            visible_to = json.loads(parent['visible_to']) if parent['visible_to'] != 'all' else ['admin', 'hr', 'viewer']
            
            if role is None or role in visible_to:
                item = dict(parent)
                
                # Get children
                children = db.execute(
                    'SELECT * FROM menu_items WHERE parent_id = ? ORDER BY position',
                    (parent['id'],)
                ).fetchall()
                
                # Filter children by role
                if role:
                    item['children'] = []
                    for child in children:
                        child_visible = json.loads(child['visible_to']) if child['visible_to'] != 'all' else ['admin', 'hr', 'viewer']
                        if role in child_visible:
                            item['children'].append(dict(child))
                else:
                    item['children'] = [dict(child) for child in children]
                
                result.append(item)
        
        return result
    except sqlite3.Error:
        # Table might not exist yet
        return []

def get_projects():
    """Get all active projects from database."""
    db = get_db()
    return db.execute('SELECT * FROM projects WHERE active = 1').fetchall()

def get_form_fields(form_id):
    """Get form fields for a specific form"""
    db = get_db()
    try:
        return db.execute(
            'SELECT * FROM form_fields WHERE form_id = ? AND active = 1 ORDER BY position',
            (form_id,)
        ).fetchall()
    except sqlite3.Error:
        # Table might not exist yet
        return []

def get_field_connections(source_field_id=None):
    """Get field connections"""
    db = get_db()
    try:
        if source_field_id:
            return db.execute(
                '''SELECT c.*, 
                          s.field_name as source_name, s.form_id as source_form,
                          t.field_name as target_name, t.form_id as target_form
                   FROM field_connections c
                   JOIN form_fields s ON c.source_field_id = s.id
                   JOIN form_fields t ON c.target_field_id = t.id
                   WHERE c.source_field_id = ? AND c.active = 1''',
                (source_field_id,)
            ).fetchall()
        else:
            return db.execute(
                '''SELECT c.*, 
                          s.field_name as source_name, s.form_id as source_form,
                          t.field_name as target_name, t.form_id as target_form
                   FROM field_connections c
                   JOIN form_fields s ON c.source_field_id = s.id
                   JOIN form_fields t ON c.target_field_id = t.id
                   WHERE c.active = 1'''
            ).fetchall()
    except sqlite3.Error:
        # Table might not exist yet
        return []

def get_custom_styles():
    """Get custom styling from database"""
    db = get_db()
    try:
        style = db.execute('SELECT * FROM custom_styles ORDER BY id DESC LIMIT 1').fetchone()
        return style if style else {
            'background_color': '#ffffff',
            'text_color': '#333333',
            'font_size': '16px'
        }
    except sqlite3.Error:
        # Table might not exist yet
        return {
            'background_color': '#ffffff',
            'text_color': '#333333',
            'font_size': '16px'
        }

def get_suggestions(field, partial_input, form_id=None):
    """Get suggestions for auto-complete fields"""
    db = get_db()
    
    # For attendance-related fields
    if field == 'employee_id':
        results = db.execute(
            'SELECT DISTINCT employee_id FROM attendance WHERE employee_id LIKE ? ORDER BY employee_id LIMIT 10',
            (f'{partial_input}%',)
        ).fetchall()
        return [row['employee_id'] for row in results]
    
    # For project-related fields
    elif field == 'project':
        results = db.execute(
            'SELECT id, name FROM projects WHERE name LIKE ? AND active = 1 ORDER BY name LIMIT 10',
            (f'{partial_input}%',)
        ).fetchall()
        return [{'id': row['id'], 'name': row['name']} for row in results]
    
    # For location
    elif field == 'location':
        results = db.execute(
            'SELECT DISTINCT location FROM projects WHERE location LIKE ? ORDER BY location LIMIT 10',
            (f'{partial_input}%',)
        ).fetchall()
        return [row['location'] for row in results]
    
    # For custom form fields
    elif form_id:
        # Get form field information
        form_field = db.execute(
            'SELECT * FROM form_fields WHERE form_id = ? AND field_name = ?',
            (form_id, field)
        ).fetchone()
        
        if form_field and form_field['field_type'] == 'select':
            # For select fields, return options from the field definition
            try:
                options = json.loads(form_field['options'])
                return [opt for opt in options if opt.lower().startswith(partial_input.lower())]
            except (json.JSONDecodeError, TypeError):
                return []
    
    return []

@app.context_processor
def inject_context():
    """Add common data to template context."""
    # Get current user if logged in
    user = get_current_user() if 'user_id' in session else None
    
    # Get custom styles
    styles = get_custom_styles()
    
    # Get menu items if user is logged in and has a role
    menu_items = get_menu_items(user['role'] if user else None)
    
    return {
        'now': datetime.datetime.now(),
        'current_user': user,
        'menu_items': menu_items,
        'custom_styles': styles
    }

# Routes for attendance application
@app.route('/')
def index():
    """Main page with clock in/out form"""
    projects = get_projects()
    
    # Check if the request is coming from a mobile device
    user_agent = request.headers.get('User-Agent', '').lower()
    mobile_agents = ['android', 'iphone', 'ipad', 'ipod', 'opera mobile', 'blackberry', 'mobile']
    
    is_mobile = any(agent in user_agent for agent in mobile_agents)
    
    # Render mobile or desktop template accordingly
    if is_mobile:
        return render_template('mobile_app.html', projects=projects)
    else:
        return render_template('index.html', projects=projects)

@app.route('/mobile')
def mobile_app():
    """Mobile-specific page for attendance tracking"""
    projects = get_projects()
    return render_template('mobile_app.html', projects=projects)

@app.route('/submit', methods=['POST'])
def submit():
    """Handle attendance form submission"""
    if request.method != 'POST':
        return redirect(url_for('index'))
    
    employee_id = request.form.get('employee_id')
    action = request.form.get('action')
    project_id = request.form.get('project_id')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    
    # Validate inputs
    if not employee_id or not action:
        flash('Employee ID and action are required.', 'danger')
        return redirect(url_for('index'))
    
    # Handle photo upload if provided
    photo_path = None
    if 'photo' in request.files:
        photo = request.files['photo']
        if photo and photo.filename and allowed_file(photo.filename):
            filename = secure_filename(f"{employee_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
            photo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            photo.save(photo_path)
            photo_path = filename  # Store only filename in DB
    
    # Insert record into database
    db = get_db()
    
    # Check for duplicate entry (same employee, same action, same day)
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    duplicate = db.execute('''
        SELECT id FROM attendance 
        WHERE employee_id = ? AND action = ? AND date(timestamp) = date(?)
    ''', (employee_id, action, today)).fetchone()
    
    if duplicate:
        flash(f'You have already {action.lower()}ed today.', 'warning')
        return redirect(url_for('index'))
    
    # Get project details if provided
    project_name = None
    if project_id:
        project = db.execute('SELECT name FROM projects WHERE id = ?', (project_id,)).fetchone()
        if project:
            project_name = project['name']
    
    # Insert attendance record
    db.execute('''
        INSERT INTO attendance (employee_id, action, project_id, project_name, latitude, longitude, photo_path)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (employee_id, action, project_id, project_name, latitude, longitude, photo_path))
    db.commit()
    
    flash(f'Successfully {action.lower()}ed. Thank you!', 'success')
    return redirect(url_for('index'))

# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        db = get_db()
        admin = db.execute(
            'SELECT * FROM admins WHERE username = ?', (username,)
        ).fetchone()
        
        if admin and check_password_hash(admin['password'], password):
            session.clear()
            session['admin_logged_in'] = True
            session['admin_id'] = admin['id']
            return redirect(url_for('admin_dashboard'))
        
        flash('Invalid username or password', 'danger')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    """Admin dashboard to view attendance records"""
    db = get_db()
    
    # Filter parameters
    date_filter = request.args.get('date')
    employee_filter = request.args.get('employee_id')
    project_filter = request.args.get('project_id')
    
    # Build query based on filters
    query = 'SELECT * FROM attendance'
    params = []
    
    where_clauses = []
    if date_filter:
        where_clauses.append('date(timestamp) = date(?)')
        params.append(date_filter)
    
    if employee_filter:
        where_clauses.append('employee_id = ?')
        params.append(employee_filter)
    
    if project_filter:
        where_clauses.append('project_id = ?')
        params.append(project_filter)
    
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    
    query += ' ORDER BY timestamp DESC'
    
    # Execute query
    attendances = db.execute(query, params).fetchall()
    
    # Get all employees and projects for filter dropdowns
    employees = db.execute('SELECT DISTINCT employee_id FROM attendance').fetchall()
    projects = db.execute('SELECT * FROM projects').fetchall()
    
    # Check if any attendance records have location data
    any_locations = any(a['latitude'] and a['longitude'] for a in attendances)
    
    return render_template(
        'admin_dashboard.html',
        attendances=attendances,
        employees=employees,
        projects=projects,
        date_filter=date_filter,
        employee_filter=employee_filter,
        project_filter=project_filter,
        any_locations=any_locations
    )

@app.route('/admin/projects')
@admin_required
def admin_projects():
    """Projects management page"""
    db = get_db()
    projects = db.execute('SELECT * FROM projects ORDER BY name').fetchall()
    return render_template('admin_projects.html', projects=projects)

@app.route('/admin/projects/add', methods=['GET', 'POST'])
@admin_required
def add_project():
    """Add a new project"""
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description', '')
        location = request.form.get('location', '')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        active = True if request.form.get('active') else False
        custom_fields = request.form.get('custom_fields', '{}')
        
        # Validate inputs
        if not name:
            flash('Project name is required.', 'danger')
            return redirect(url_for('add_project'))
        
        # Validate JSON for custom fields
        try:
            json.loads(custom_fields)
        except json.JSONDecodeError:
            flash('Custom fields must be valid JSON.', 'danger')
            return redirect(url_for('add_project'))
        
        # Insert into database
        db = get_db()
        db.execute('''
            INSERT INTO projects (name, description, location, start_date, end_date, active, custom_fields)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (name, description, location, start_date, end_date, active, custom_fields))
        db.commit()
        
        flash('Project added successfully.', 'success')
        return redirect(url_for('admin_projects'))
    
    return render_template('project_form.html')

@app.route('/admin/projects/<int:project_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_project(project_id):
    """Edit an existing project"""
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    
    if not project:
        flash('Project not found.', 'danger')
        return redirect(url_for('admin_projects'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description', '')
        location = request.form.get('location', '')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        active = True if request.form.get('active') else False
        custom_fields = request.form.get('custom_fields', '{}')
        
        # Validate inputs
        if not name:
            flash('Project name is required.', 'danger')
            return redirect(url_for('edit_project', project_id=project_id))
        
        # Validate JSON for custom fields
        try:
            json.loads(custom_fields)
        except json.JSONDecodeError:
            flash('Custom fields must be valid JSON.', 'danger')
            return redirect(url_for('edit_project', project_id=project_id))
        
        # Update database
        db.execute('''
            UPDATE projects 
            SET name = ?, description = ?, location = ?, start_date = ?, 
                end_date = ?, active = ?, custom_fields = ?
            WHERE id = ?
        ''', (name, description, location, start_date, end_date, active, custom_fields, project_id))
        db.commit()
        
        flash('Project updated successfully.', 'success')
        return redirect(url_for('admin_projects'))
    
    return render_template('project_form.html', project=project)

@app.route('/admin/projects/<int:project_id>/delete', methods=['POST'])
@admin_required
def delete_project(project_id):
    """Delete a project"""
    db = get_db()
    db.execute('DELETE FROM projects WHERE id = ?', (project_id,))
    db.commit()
    
    flash('Project deleted successfully.', 'success')
    return redirect(url_for('admin_projects'))

@app.route('/admin/projects/<int:project_id>/fields', methods=['GET', 'POST'])
@admin_required
def manage_custom_fields(project_id):
    """Manage custom fields for a project"""
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    
    if not project:
        flash('Project not found.', 'danger')
        return redirect(url_for('admin_projects'))
    
    # Get current custom fields
    try:
        custom_fields = json.loads(project['custom_fields'])
    except (json.JSONDecodeError, TypeError):
        custom_fields = {}
    
    if request.method == 'POST':
        field_name = request.form.get('field_name')
        field_type = request.form.get('field_type')
        
        if not field_name or not field_type:
            flash('Field name and type are required.', 'danger')
            return redirect(url_for('manage_custom_fields', project_id=project_id))
        
        # Create new field entry
        field_info = {'type': field_type}
        
        # Handle options for select type
        if field_type == 'select':
            options_text = request.form.get('field_options', '')
            options = [opt.strip() for opt in options_text.split(',') if opt.strip()]
            if not options:
                flash('Select fields must have at least one option.', 'danger')
                return redirect(url_for('manage_custom_fields', project_id=project_id))
            field_info['options'] = options
        
        # Add to custom fields
        custom_fields[field_name] = field_info
        
        # Update database
        db.execute(
            'UPDATE projects SET custom_fields = ? WHERE id = ?',
            (json.dumps(custom_fields), project_id)
        )
        db.commit()
        
        flash(f'Field "{field_name}" added successfully.', 'success')
        return redirect(url_for('manage_custom_fields', project_id=project_id))
    
    return render_template('project_fields.html', project=project, custom_fields=custom_fields)

@app.route('/admin/projects/<int:project_id>/fields/<field_name>/delete', methods=['POST'])
@admin_required
def delete_custom_field(project_id, field_name):
    """Delete a custom field from a project"""
    db = get_db()
    project = db.execute('SELECT * FROM projects WHERE id = ?', (project_id,)).fetchone()
    
    if not project:
        flash('Project not found.', 'danger')
        return redirect(url_for('admin_projects'))
    
    # Get current custom fields
    try:
        custom_fields = json.loads(project['custom_fields'])
    except (json.JSONDecodeError, TypeError):
        custom_fields = {}
    
    # Remove field
    if field_name in custom_fields:
        del custom_fields[field_name]
        
        # Update database
        db.execute(
            'UPDATE projects SET custom_fields = ? WHERE id = ?',
            (json.dumps(custom_fields), project_id)
        )
        db.commit()
        
        flash(f'Field "{field_name}" deleted successfully.', 'success')
    else:
        flash(f'Field "{field_name}" not found.', 'warning')
    
    return redirect(url_for('manage_custom_fields', project_id=project_id))

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Health check and error monitoring
@app.route('/check-system-health')
@admin_required
def check_system_health():
    """System health check page for admins"""
    try:
        db = get_db()
        
        # Check database connection
        db_status = "ok"
        db_message = "Database connection successful"
        try:
            db.execute('SELECT 1').fetchone()
        except sqlite3.Error as e:
            db_status = "error"
            db_message = f"Database error: {str(e)}"
        
        # Check upload directory
        upload_status = "ok"
        upload_message = f"Upload directory exists and is writable: {UPLOAD_FOLDER}"
        if not os.path.exists(UPLOAD_FOLDER):
            try:
                os.makedirs(UPLOAD_FOLDER)
                upload_status = "warning"
                upload_message = f"Upload directory was missing and has been created: {UPLOAD_FOLDER}"
            except OSError:
                upload_status = "error"
                upload_message = f"Upload directory missing and could not be created: {UPLOAD_FOLDER}"
        elif not os.access(UPLOAD_FOLDER, os.W_OK):
            upload_status = "error"
            upload_message = f"Upload directory exists but is not writable: {UPLOAD_FOLDER}"
        
        # Check database tables
        tables_status = "ok"
        tables_message = "All required database tables exist"
        required_tables = ['admins', 'users', 'projects', 'attendance', 'menu_items', 
                          'form_fields', 'field_connections', 'custom_styles', 'error_logs']
        
        missing_tables = []
        for table in required_tables:
            try:
                db.execute(f"SELECT 1 FROM {table} LIMIT 1")
            except sqlite3.Error:
                missing_tables.append(table)
        
        if missing_tables:
            if len(missing_tables) == len(required_tables):
                tables_status = "error"
                tables_message = "No required tables exist. Database not initialized."
            else:
                tables_status = "warning"
                tables_message = f"Some tables are missing: {', '.join(missing_tables)}"
        
        # Get recent errors
        recent_errors = []
        try:
            recent_errors = db.execute(
                'SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10'
            ).fetchall()
        except sqlite3.Error:
            pass
            
        # Attempt to fix missing tables if any
        if missing_tables:
            if 'error_logs' in missing_tables and tables_status == "warning":
                try:
                    db.execute('''
                        CREATE TABLE IF NOT EXISTS error_logs (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            error_type TEXT NOT NULL,
                            error_message TEXT NOT NULL,
                            error_details TEXT,
                            resolved BOOLEAN DEFAULT 0,
                            resolution_notes TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            resolved_at TIMESTAMP
                        )
                    ''')
                    db.commit()
                    missing_tables.remove('error_logs')
                except sqlite3.Error:
                    pass
            
            if missing_tables and tables_status != "error":
                # Only try to fix if it's not a completely missing database
                try:
                    with app.open_resource('schema.sql') as f:
                        script = f.read().decode('utf8')
                        # Extract only the CREATE TABLE statements for missing tables
                        for table in missing_tables:
                            # Find the CREATE TABLE statement for this table
                            pattern = f"CREATE TABLE IF NOT EXISTS {table}|CREATE TABLE {table}"
                            if re.search(pattern, script, re.IGNORECASE):
                                # Extract and run just that statement
                                create_stmt = re.search(f"(CREATE TABLE.*?{table}.*?);", script, re.IGNORECASE | re.DOTALL)
                                if create_stmt:
                                    db.execute(create_stmt.group(1))
                                    db.commit()
                    
                    log_error('system', 'Auto-recovery attempted for missing tables', 
                             f'Attempted to recreate tables: {", ".join(missing_tables)}')
                except Exception as e:
                    log_error('system', 'Failed to auto-recover missing tables', str(e))
        
        return render_template(
            'system_health.html',
            db_status=db_status,
            db_message=db_message,
            upload_status=upload_status,
            upload_message=upload_message,
            tables_status=tables_status,
            tables_message=tables_message,
            recent_errors=recent_errors
        )
    except Exception as e:
        error_details = traceback.format_exc()
        try:
            log_error('system', f'Error in system health check: {str(e)}', error_details)
        except:
            pass
        return render_template('error.html', error_message=str(e), details=error_details)

@app.route('/admin/resolve-error/<int:error_id>', methods=['POST'])
@admin_required
def resolve_error(error_id):
    """Mark an error as resolved"""
    db = get_db()
    resolution_notes = request.form.get('resolution_notes', '')
    
    try:
        db.execute(
            'UPDATE error_logs SET resolved = 1, resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
            (resolution_notes, error_id)
        )
        db.commit()
        flash('Error marked as resolved.', 'success')
    except sqlite3.Error as e:
        flash(f'Failed to update error: {str(e)}', 'danger')
    
    return redirect(url_for('check_system_health'))

# User Management
@app.route('/admin/users')
@admin_required
def admin_users():
    """User management page"""
    db = get_db()
    users = db.execute('SELECT * FROM users ORDER BY username').fetchall()
    return render_template('admin_users.html', users=users)

@app.route('/admin/users/add', methods=['GET', 'POST'])
@admin_required
def add_user():
    """Add a new user"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        email = request.form.get('email')
        role = request.form.get('role')
        
        # Validate inputs
        if not username or not password or not role:
            flash('Username, password and role are required.', 'danger')
            return redirect(url_for('add_user'))
        
        if role not in ['admin', 'hr', 'viewer']:
            flash('Invalid role.', 'danger')
            return redirect(url_for('add_user'))
        
        # Check if username already exists
        db = get_db()
        existing_user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if existing_user:
            flash('Username already exists.', 'danger')
            return redirect(url_for('add_user'))
        
        # Insert new user
        try:
            db.execute(
                'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
                (username, generate_password_hash(password), email, role)
            )
            db.commit()
            flash('User added successfully.', 'success')
            return redirect(url_for('admin_users'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('add_user'))
    
    return render_template('user_form.html')

@app.route('/admin/users/<int:user_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_user(user_id):
    """Edit an existing user"""
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    if not user:
        flash('User not found.', 'danger')
        return redirect(url_for('admin_users'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        role = request.form.get('role')
        password = request.form.get('password')
        
        # Validate inputs
        if not username or not role:
            flash('Username and role are required.', 'danger')
            return redirect(url_for('edit_user', user_id=user_id))
        
        if role not in ['admin', 'hr', 'viewer']:
            flash('Invalid role.', 'danger')
            return redirect(url_for('edit_user', user_id=user_id))
        
        # Check if username already exists for other users
        existing_user = db.execute(
            'SELECT * FROM users WHERE username = ? AND id != ?', 
            (username, user_id)
        ).fetchone()
        
        if existing_user:
            flash('Username already exists.', 'danger')
            return redirect(url_for('edit_user', user_id=user_id))
        
        # Update user in database
        try:
            if password:
                # Update with new password
                db.execute(
                    'UPDATE users SET username = ?, password = ?, email = ?, role = ? WHERE id = ?',
                    (username, generate_password_hash(password), email, role, user_id)
                )
            else:
                # Update without changing password
                db.execute(
                    'UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?',
                    (username, email, role, user_id)
                )
            
            db.commit()
            flash('User updated successfully.', 'success')
            return redirect(url_for('admin_users'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('edit_user', user_id=user_id))
    
    return render_template('user_form.html', user=user)

@app.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@admin_required
def delete_user(user_id):
    """Delete a user"""
    db = get_db()
    
    # Don't allow deleting the last admin
    admin_count = db.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"').fetchone()
    if admin_count and admin_count['count'] <= 1:
        user_to_delete = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        if user_to_delete and user_to_delete['role'] == 'admin':
            flash('Cannot delete the last admin user.', 'danger')
            return redirect(url_for('admin_users'))
    
    try:
        db.execute('DELETE FROM users WHERE id = ?', (user_id,))
        db.commit()
        flash('User deleted successfully.', 'success')
    except sqlite3.Error as e:
        flash(f'Database error: {str(e)}', 'danger')
    
    return redirect(url_for('admin_users'))

# Menu management
@app.route('/admin/menu')
@admin_required
def admin_menu():
    """Menu management page"""
    db = get_db()
    menu_items = db.execute(
        'SELECT * FROM menu_items WHERE parent_id IS NULL ORDER BY position'
    ).fetchall()
    
    # For each parent item, fetch its children
    for item in menu_items:
        item = dict(item)
        item['children'] = db.execute(
            'SELECT * FROM menu_items WHERE parent_id = ? ORDER BY position',
            (item['id'],)
        ).fetchall()
    
    return render_template('admin_menu.html', menu_items=menu_items)

@app.route('/admin/menu/add', methods=['GET', 'POST'])
@admin_required
def add_menu_item():
    """Add a new menu item"""
    db = get_db()
    parent_items = db.execute(
        'SELECT * FROM menu_items WHERE parent_id IS NULL ORDER BY title'
    ).fetchall()
    
    if request.method == 'POST':
        title = request.form.get('title')
        icon = request.form.get('icon')
        url = request.form.get('url')
        parent_id = request.form.get('parent_id')
        visible_to = request.form.getlist('visible_to')
        
        # Validate inputs
        if not title:
            flash('Menu item title is required.', 'danger')
            return redirect(url_for('add_menu_item'))
        
        # Convert parent_id to integer or None
        if parent_id:
            try:
                parent_id = int(parent_id)
            except ValueError:
                parent_id = None
        else:
            parent_id = None
        
        # Convert visible_to to JSON
        if not visible_to:
            visible_to = 'all'
        else:
            visible_to = json.dumps(visible_to)
        
        # Get the highest position for the current level
        if parent_id:
            max_position = db.execute(
                'SELECT MAX(position) as max_pos FROM menu_items WHERE parent_id = ?',
                (parent_id,)
            ).fetchone()
        else:
            max_position = db.execute(
                'SELECT MAX(position) as max_pos FROM menu_items WHERE parent_id IS NULL'
            ).fetchone()
        
        new_position = (max_position['max_pos'] or 0) + 1
        
        # Insert into database
        try:
            db.execute(
                'INSERT INTO menu_items (title, icon, url, parent_id, position, visible_to) VALUES (?, ?, ?, ?, ?, ?)',
                (title, icon, url, parent_id, new_position, visible_to)
            )
            db.commit()
            flash('Menu item added successfully.', 'success')
            return redirect(url_for('admin_menu'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('add_menu_item'))
    
    return render_template('menu_item_form.html', parent_items=parent_items)

@app.route('/admin/menu/<int:item_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_menu_item(item_id):
    """Edit a menu item"""
    db = get_db()
    item = db.execute('SELECT * FROM menu_items WHERE id = ?', (item_id,)).fetchone()
    
    if not item:
        flash('Menu item not found.', 'danger')
        return redirect(url_for('admin_menu'))
    
    # Get potential parent items (excluding this item and its children)
    parent_items = db.execute(
        'SELECT * FROM menu_items WHERE id != ? AND parent_id IS NULL AND id NOT IN (SELECT id FROM menu_items WHERE parent_id = ?) ORDER BY title',
        (item_id, item_id)
    ).fetchall()
    
    if request.method == 'POST':
        title = request.form.get('title')
        icon = request.form.get('icon')
        url = request.form.get('url')
        parent_id = request.form.get('parent_id')
        visible_to = request.form.getlist('visible_to')
        
        # Validate inputs
        if not title:
            flash('Menu item title is required.', 'danger')
            return redirect(url_for('edit_menu_item', item_id=item_id))
        
        # Convert parent_id to integer or None
        if parent_id:
            try:
                parent_id = int(parent_id)
                # Check for circular reference
                if parent_id == item_id:
                    parent_id = None
            except ValueError:
                parent_id = None
        else:
            parent_id = None
        
        # Convert visible_to to JSON
        if not visible_to:
            visible_to = 'all'
        else:
            visible_to = json.dumps(visible_to)
        
        # Update database
        try:
            db.execute(
                'UPDATE menu_items SET title = ?, icon = ?, url = ?, parent_id = ?, visible_to = ? WHERE id = ?',
                (title, icon, url, parent_id, visible_to, item_id)
            )
            db.commit()
            flash('Menu item updated successfully.', 'success')
            return redirect(url_for('admin_menu'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('edit_menu_item', item_id=item_id))
    
    # Parse visible_to for the form
    if item['visible_to'] == 'all':
        visible_to = ['admin', 'hr', 'viewer']
    else:
        try:
            visible_to = json.loads(item['visible_to'])
        except (json.JSONDecodeError, TypeError):
            visible_to = []
    
    return render_template('menu_item_form.html', item=item, parent_items=parent_items, visible_to=visible_to)

@app.route('/admin/menu/<int:item_id>/delete', methods=['POST'])
@admin_required
def delete_menu_item(item_id):
    """Delete a menu item"""
    db = get_db()
    
    try:
        # First, delete any children
        db.execute('DELETE FROM menu_items WHERE parent_id = ?', (item_id,))
        
        # Then delete the item itself
        db.execute('DELETE FROM menu_items WHERE id = ?', (item_id,))
        
        db.commit()
        flash('Menu item deleted successfully.', 'success')
    except sqlite3.Error as e:
        flash(f'Database error: {str(e)}', 'danger')
    
    return redirect(url_for('admin_menu'))

@app.route('/admin/menu/reorder', methods=['POST'])
@admin_required
def reorder_menu_items():
    """Reorder menu items via AJAX"""
    data = request.json
    
    if not data or 'items' not in data:
        return jsonify({'success': False, 'message': 'Invalid data'}), 400
    
    try:
        db = get_db()
        
        for item in data['items']:
            item_id = item.get('id')
            position = item.get('position')
            parent_id = item.get('parent_id')
            
            if parent_id == "null":
                parent_id = None
            
            db.execute(
                'UPDATE menu_items SET position = ?, parent_id = ? WHERE id = ?',
                (position, parent_id, item_id)
            )
        
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Form fields management
@app.route('/admin/fields')
@admin_required
def admin_fields():
    """Form fields management page"""
    db = get_db()
    form_ids = db.execute(
        'SELECT DISTINCT form_id FROM form_fields ORDER BY form_id'
    ).fetchall()
    
    form_fields = {}
    for form in form_ids:
        form_id = form['form_id']
        fields = db.execute(
            'SELECT * FROM form_fields WHERE form_id = ? AND active = 1 ORDER BY position',
            (form_id,)
        ).fetchall()
        form_fields[form_id] = fields
    
    return render_template('admin_fields.html', form_fields=form_fields)

@app.route('/admin/fields/add', methods=['GET', 'POST'])
@admin_required
def add_field():
    """Add a new form field"""
    if request.method == 'POST':
        field_name = request.form.get('field_name')
        display_name = request.form.get('display_name')
        field_type = request.form.get('field_type')
        form_id = request.form.get('form_id')
        required = True if request.form.get('required') else False
        options = request.form.get('options')
        
        # Validate inputs
        if not field_name or not display_name or not field_type or not form_id:
            flash('All fields are required.', 'danger')
            return redirect(url_for('add_field'))
        
        # Format options as JSON if provided (for select type)
        if field_type == 'select' and options:
            options_list = [opt.strip() for opt in options.split(',') if opt.strip()]
            options = json.dumps(options_list)
        else:
            options = None
        
        # Get the highest position for this form
        db = get_db()
        max_position = db.execute(
            'SELECT MAX(position) as max_pos FROM form_fields WHERE form_id = ?',
            (form_id,)
        ).fetchone()
        
        new_position = (max_position['max_pos'] or 0) + 1
        
        # Insert into database
        try:
            db.execute(
                '''INSERT INTO form_fields 
                   (field_name, display_name, field_type, options, required, form_id, position) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (field_name, display_name, field_type, options, required, form_id, new_position)
            )
            db.commit()
            flash('Form field added successfully.', 'success')
            return redirect(url_for('admin_fields'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('add_field'))
    
    return render_template('field_form.html')

@app.route('/admin/fields/<int:field_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_field(field_id):
    """Edit a form field"""
    db = get_db()
    field = db.execute('SELECT * FROM form_fields WHERE id = ?', (field_id,)).fetchone()
    
    if not field:
        flash('Field not found.', 'danger')
        return redirect(url_for('admin_fields'))
    
    if request.method == 'POST':
        field_name = request.form.get('field_name')
        display_name = request.form.get('display_name')
        field_type = request.form.get('field_type')
        form_id = request.form.get('form_id')
        required = True if request.form.get('required') else False
        options = request.form.get('options')
        
        # Validate inputs
        if not field_name or not display_name or not field_type or not form_id:
            flash('All fields are required.', 'danger')
            return redirect(url_for('edit_field', field_id=field_id))
        
        # Format options as JSON if provided (for select type)
        if field_type == 'select' and options:
            options_list = [opt.strip() for opt in options.split(',') if opt.strip()]
            options = json.dumps(options_list)
        else:
            options = None
        
        # Update database
        try:
            db.execute(
                '''UPDATE form_fields 
                   SET field_name = ?, display_name = ?, field_type = ?, 
                       options = ?, required = ?, form_id = ?
                   WHERE id = ?''',
                (field_name, display_name, field_type, options, required, form_id, field_id)
            )
            db.commit()
            flash('Form field updated successfully.', 'success')
            return redirect(url_for('admin_fields'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('edit_field', field_id=field_id))
    
    # Parse options for the form if this is a select field
    options_text = ''
    if field['field_type'] == 'select' and field['options']:
        try:
            options_list = json.loads(field['options'])
            options_text = ', '.join(options_list)
        except (json.JSONDecodeError, TypeError):
            pass
    
    return render_template('field_form.html', field=field, options_text=options_text)

@app.route('/admin/fields/<int:field_id>/delete', methods=['POST'])
@admin_required
def delete_field(field_id):
    """Delete a form field"""
    db = get_db()
    
    try:
        # Check if this field is used in any connections
        connections = db.execute(
            'SELECT COUNT(*) as count FROM field_connections WHERE source_field_id = ? OR target_field_id = ?',
            (field_id, field_id)
        ).fetchone()
        
        if connections and connections['count'] > 0:
            # Soft delete by setting active to false
            db.execute('UPDATE form_fields SET active = 0 WHERE id = ?', (field_id,))
        else:
            # Hard delete
            db.execute('DELETE FROM form_fields WHERE id = ?', (field_id,))
        
        db.commit()
        flash('Form field deleted successfully.', 'success')
    except sqlite3.Error as e:
        flash(f'Database error: {str(e)}', 'danger')
    
    return redirect(url_for('admin_fields'))

# Field connections
@app.route('/admin/connections')
@admin_required
def admin_connections():
    """Field connections management page"""
    db = get_db()
    
    connections = db.execute('''
        SELECT c.*, 
               sf.field_name as source_field_name, sf.form_id as source_form_id,
               tf.field_name as target_field_name, tf.form_id as target_form_id
        FROM field_connections c
        JOIN form_fields sf ON c.source_field_id = sf.id
        JOIN form_fields tf ON c.target_field_id = tf.id
        WHERE c.active = 1
        ORDER BY sf.form_id, sf.field_name
    ''').fetchall()
    
    # Get all available fields for creating new connections
    fields = db.execute(
        'SELECT * FROM form_fields WHERE active = 1 ORDER BY form_id, position'
    ).fetchall()
    
    return render_template('admin_connections.html', connections=connections, fields=fields)

@app.route('/admin/connections/add', methods=['GET', 'POST'])
@admin_required
def add_connection():
    """Add a new field connection"""
    db = get_db()
    
    # Get all available fields
    fields = db.execute(
        'SELECT * FROM form_fields WHERE active = 1 ORDER BY form_id, position'
    ).fetchall()
    
    if request.method == 'POST':
        source_field_id = request.form.get('source_field_id')
        target_field_id = request.form.get('target_field_id')
        connection_type = request.form.get('connection_type')
        parameters = request.form.get('parameters')
        
        # Validate inputs
        if not source_field_id or not target_field_id or not connection_type:
            flash('All fields are required.', 'danger')
            return redirect(url_for('add_connection'))
        
        # Convert IDs to integers
        try:
            source_field_id = int(source_field_id)
            target_field_id = int(target_field_id)
        except ValueError:
            flash('Invalid field IDs.', 'danger')
            return redirect(url_for('add_connection'))
        
        # Check that source and target are different
        if source_field_id == target_field_id:
            flash('Source and target fields must be different.', 'danger')
            return redirect(url_for('add_connection'))
        
        # Validate parameters JSON if provided
        if parameters:
            try:
                json.loads(parameters)
            except json.JSONDecodeError:
                flash('Parameters must be valid JSON.', 'danger')
                return redirect(url_for('add_connection'))
        
        # Insert into database
        try:
            db.execute(
                '''INSERT INTO field_connections 
                   (source_field_id, target_field_id, connection_type, parameters, active) 
                   VALUES (?, ?, ?, ?, 1)''',
                (source_field_id, target_field_id, connection_type, parameters)
            )
            db.commit()
            flash('Field connection added successfully.', 'success')
            return redirect(url_for('admin_connections'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
            return redirect(url_for('add_connection'))
    
    return render_template('connection_form.html', fields=fields)

@app.route('/admin/connections/<int:connection_id>/delete', methods=['POST'])
@admin_required
def delete_connection(connection_id):
    """Delete a field connection"""
    db = get_db()
    
    try:
        db.execute('UPDATE field_connections SET active = 0 WHERE id = ?', (connection_id,))
        db.commit()
        flash('Connection deleted successfully.', 'success')
    except sqlite3.Error as e:
        flash(f'Database error: {str(e)}', 'danger')
    
    return redirect(url_for('admin_connections'))

# Custom styling
@app.route('/admin/styling', methods=['GET', 'POST'])
@admin_required
def admin_styling():
    """Custom styling management page"""
    db = get_db()
    
    # Get current styling
    try:
        style = db.execute('SELECT * FROM custom_styles ORDER BY id DESC LIMIT 1').fetchone()
    except sqlite3.Error:
        style = None
    
    if request.method == 'POST':
        background_color = request.form.get('background_color', '#ffffff')
        text_color = request.form.get('text_color', '#333333')
        font_size = request.form.get('font_size', '16px')
        custom_css = request.form.get('custom_css', '')
        
        try:
            db.execute(
                '''INSERT INTO custom_styles 
                   (background_color, text_color, font_size, custom_css) 
                   VALUES (?, ?, ?, ?)''',
                (background_color, text_color, font_size, custom_css)
            )
            db.commit()
            flash('Styling updated successfully. Refresh to see changes.', 'success')
            return redirect(url_for('admin_styling'))
        except sqlite3.Error as e:
            flash(f'Database error: {str(e)}', 'danger')
    
    return render_template('admin_styling.html', style=style)

# API routes for suggestions and field connections
@app.route('/api/suggestions')
def api_suggestions():
    """API endpoint for auto-suggestions"""
    field = request.args.get('field')
    query = request.args.get('q', '')
    form_id = request.args.get('form_id')
    
    if not field or len(query) < 2:
        return jsonify([])
    
    try:
        suggestions = get_suggestions(field, query, form_id)
        return jsonify(suggestions)
    except Exception as e:
        log_error('api', f'Error getting suggestions: {str(e)}')
        return jsonify([])

@app.route('/api/field-connections')
def api_field_connections():
    """API endpoint to get field connections"""
    try:
        source_field_id = request.args.get('source_field_id')
        form_id = request.args.get('form_id')
        
        # First try to query by source_field_id if provided
        if source_field_id:
            try:
                source_field_id = int(source_field_id)
                connections = get_field_connections(source_field_id)
            except ValueError:
                return jsonify({'error': 'Invalid source field ID'}), 400
        else:
            # Get all connections
            connections = get_field_connections()
        
        # Filter by form_id if provided
        if form_id:
            connections = [c for c in connections if c['source_form'] == form_id]
        
        # Convert Row objects to dictionaries
        result = []
        for conn in connections:
            conn_dict = dict(conn)
            
            # Parse parameters if they exist
            if conn_dict.get('parameters'):
                try:
                    conn_dict['parameters'] = json.loads(conn_dict['parameters'])
                except json.JSONDecodeError:
                    conn_dict['parameters'] = {}
            else:
                conn_dict['parameters'] = {}
            
            # Convert to a format that matches our client-side field connection manager
            formatted_conn = {
                'id': conn_dict['id'],
                'source_field_id': conn_dict['source_field_id'],
                'target_field_id': conn_dict['target_field_id'],
                'source_field_name': conn_dict['source_name'],
                'target_field_name': conn_dict['target_name'],
                'source_form': conn_dict['source_form'],
                'target_form': conn_dict['target_form'],
                'connection_type': conn_dict['connection_type'],
                'parameters': conn_dict['parameters'],
                'active': conn_dict['active'] == 1
            }
            
            result.append(formatted_conn)
        
        # Get suggestion fields
        suggestion_fields = []
        if form_id:
            db = get_db()
            fields = db.execute(
                '''SELECT field_name FROM form_fields 
                   WHERE form_id = ? AND suggestions_enabled = 1''',
                (form_id,)
            ).fetchall()
            suggestion_fields = [field['field_name'] for field in fields]
        
        # Return both connections and suggestion fields
        return jsonify({
            'connections': result,
            'suggestions': suggestion_fields
        })
    except Exception as e:
        log_error('api', f'Error getting field connections: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/related-field-value')
def api_related_field_value():
    """API endpoint to get related field value"""
    source_field = request.args.get('source_field')
    source_value = request.args.get('source_value')
    target_field = request.args.get('target_field', None)
    source_form = request.args.get('source_form', None)
    
    if not source_field or not source_value:
        return jsonify({'error': 'Missing required parameters: source_field and source_value required'}), 400
    
    try:
        db = get_db()
        
        # Looking up employee data by ID (most common case)
        if source_field == 'employee_id':
            # First try new employees table
            employee = db.execute(
                'SELECT * FROM employees WHERE id = ?', 
                (source_value,)
            ).fetchone()
            
            # If found in employees table
            if employee:
                if target_field:
                    # Return specific field if requested
                    if target_field in dict(employee).keys():
                        return jsonify({'value': employee[target_field]})
                else:
                    # Return all employee data if no specific field requested
                    return jsonify({'value': dict(employee)})
            
            # Try attendance table as fallback for older records
            if not employee and target_field == 'employee_name':
                att_record = db.execute(
                    'SELECT employee_name FROM attendance WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1', 
                    (source_value,)
                ).fetchone()
                
                if att_record:
                    return jsonify({'value': att_record['employee_name']})
        
        # Handle employee name to ID lookup (reverse lookup)
        elif source_field == 'employee_name':
            employee = db.execute(
                'SELECT id FROM employees WHERE name = ? OR name LIKE ?', 
                (source_value, f"%{source_value}%")
            ).fetchone()
            
            if employee:
                return jsonify({'value': employee['id']})
        
        # Looking up project data
        elif source_field == 'project_id':
            project = db.execute(
                'SELECT * FROM projects WHERE id = ?', 
                (source_value,)
            ).fetchone()
            
            if project:
                if target_field:
                    # Return specific field if requested
                    if target_field in dict(project).keys():
                        return jsonify({'value': project[target_field]})
                else:
                    # Return all project data if no specific field requested
                    return jsonify({'value': dict(project)})
        
        # Looking up cash receive data
        elif source_field == 'cash_receive_id':
            transaction = db.execute(
                'SELECT * FROM cash_receives WHERE id = ?', 
                (source_value,)
            ).fetchone()
            
            if transaction:
                if target_field:
                    # Return specific field if requested
                    if target_field in dict(transaction).keys():
                        return jsonify({'value': transaction[target_field]})
                else:
                    # Return all transaction data
                    return jsonify({'value': dict(transaction)})
        
        # Looking up cash payment data
        elif source_field == 'cash_payment_id':
            transaction = db.execute(
                'SELECT * FROM cash_payments WHERE id = ?', 
                (source_value,)
            ).fetchone()
            
            if transaction:
                if target_field:
                    # Return specific field if requested
                    if target_field in dict(transaction).keys():
                        return jsonify({'value': transaction[target_field]})
                else:
                    # Return all transaction data
                    return jsonify({'value': dict(transaction)})
        
        # Return empty if no match found
        return jsonify({'value': None})
    
    except Exception as e:
        log_error('api', f'Error getting related field value: {str(e)}')
        return jsonify({'error': str(e)}), 500

# API routes
@app.route('/api/submit', methods=['POST'])
def api_submit():
    """API endpoint for submitting attendance records"""
    try:
        # Determine if request is JSON or form data
        if request.is_json:
            data = request.json
            is_form_data = False
        else:
            data = request.form.to_dict()
            is_form_data = True
        
        # For backward compatibility with both data formats
        employee_id = data.get('employee_id')
        action = data.get('action', data.get('status'))  # Support both action and status fields
        
        # Validate required fields
        if not employee_id or not action:
            return jsonify({'success': False, 'error': 'Employee ID and action/status are required'}), 400
        
        # Insert record into database
        db = get_db()
        
        # Process timestamp - use client timestamp for offline records if provided
        timestamp = None
        is_offline_record = False
        
        if data.get('offline_sync') == 'true':
            is_offline_record = True
            # Use the original timestamp if provided
            if data.get('offline_timestamp'):
                timestamp = data.get('offline_timestamp')
            else:
                timestamp = data.get('client_timestamp')
        
        # If no valid timestamp provided, use current time
        if not timestamp:
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Check for duplicate entry (same employee, same action, same day)
        # Skip duplicate check for offline records
        if not is_offline_record:
            record_date = datetime.datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d')
            duplicate = db.execute('''
                SELECT id FROM attendance 
                WHERE employee_id = ? AND action = ? AND date(created_at) = date(?)
            ''', (employee_id, action, record_date)).fetchone()
            
            if duplicate:
                return jsonify({
                    'success': False, 
                    'error': 'Duplicate entry. Already recorded for this date.'
                }), 400
        
        # Handle photo upload if present
        photo_path = None
        if is_form_data and 'photo' in request.files:
            photo = request.files['photo']
            if photo and photo.filename and allowed_file(photo.filename):
                filename = secure_filename(photo.filename)
                # Add timestamp to ensure uniqueness
                timestamp_str = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
                unique_filename = f"{timestamp_str}_{filename}"
                photo_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                photo.save(photo_path)
                photo_path = f"/uploads/{unique_filename}"
        
        # Get project details if provided
        project_name = None
        project_id = data.get('project_id')
        if project_id:
            project = db.execute('SELECT name FROM projects WHERE id = ?', (project_id,)).fetchone()
            if project:
                project_name = project['name']
        
        # Extract employee name if not provided
        employee_name = data.get('employee_name', '')
        if not employee_name and employee_id:
            employee_record = db.execute('SELECT name FROM employees WHERE id = ?', (employee_id,)).fetchone()
            if employee_record:
                employee_name = employee_record['name']
        
        # Process custom fields
        custom_fields = {}
        for key in data:
            if key.startswith('custom_'):
                custom_fields[key.replace('custom_', '', 1)] = data[key]
        
        # Extract device info if provided
        device_info = data.get('device_info')
        if not device_info and data.get('useragent'):
            device_info = json.dumps({'userAgent': data.get('useragent')})
        elif device_info and isinstance(device_info, dict):
            device_info = json.dumps(device_info)
        
        # Insert attendance record
        cursor = db.execute('''
            INSERT INTO attendance (
                employee_id, 
                employee_name,
                project_id, 
                project_name,
                action, 
                latitude, 
                longitude, 
                photo_path, 
                notes, 
                custom_fields,
                created_at,
                synced_at,
                offline_record,
                device_info
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            employee_id, 
            employee_name,
            project_id,
            project_name,
            action,
            data.get('latitude'), 
            data.get('longitude'),
            photo_path,
            data.get('notes'),
            json.dumps(custom_fields),
            timestamp,
            datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S') if is_offline_record else None,
            1 if is_offline_record else 0,
            device_info
        ))
        
        record_id = cursor.lastrowid
        db.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Successfully {action.lower()}ed',
            'record_id': record_id,
            'offline_sync': is_offline_record
        })
        
    except Exception as e:
        # Log the error for debugging
        app.logger.error(f"Error in api_submit: {str(e)}")
        traceback.print_exc()
        
        return jsonify({'success': False, 'error': str(e)}), 500

# Admin routes for field connections
@app.route('/admin/connections', endpoint='admin_connections_view')
@admin_required
def admin_connections_view():
    """Field connections management page"""
    db = get_db()
    
    # Get all connections
    connections = get_field_connections()
    
    # Prepare source and target field lookups for easier template rendering
    source_fields = {}
    target_fields = {}
    
    for conn in connections:
        if conn['source_field_id'] not in source_fields:
            field = db.execute('SELECT * FROM form_fields WHERE id = ?', (conn['source_field_id'],)).fetchone()
            if field:
                source_fields[conn['source_field_id']] = dict(field)
        
        if conn['target_field_id'] not in target_fields:
            field = db.execute('SELECT * FROM form_fields WHERE id = ?', (conn['target_field_id'],)).fetchone()
            if field:
                target_fields[conn['target_field_id']] = dict(field)
    
    # Get fields with suggestions enabled
    suggestion_fields = db.execute(
        'SELECT * FROM form_fields WHERE suggestions_enabled = 1'
    ).fetchall()
    
    return render_template('admin_field_connections.html', 
                           connections=connections,
                           source_fields=source_fields,
                           target_fields=target_fields,
                           suggestion_fields=suggestion_fields)

@app.route('/admin/connections/add', methods=['POST'], endpoint='add_field_connection_api')
@admin_required
def add_field_connection():
    """Add a new field connection"""
    if request.method != 'POST':
        return redirect(url_for('admin_connections_view'))
    
    # Get form data
    source_field_id = request.form.get('source_field_id')
    target_field_id = request.form.get('target_field_id')
    connection_type = request.form.get('connection_type')
    active = 1 if request.form.get('active') else 0
    
    # Build parameters based on connection type
    parameters = {}
    if connection_type == 'custom_formula':
        parameters['formula'] = request.form.get('custom_formula')
    elif connection_type in ['add', 'subtract', 'multiply', 'divide']:
        parameters['value'] = request.form.get('parameter_value')
    
    # Convert parameters to JSON
    parameters_json = json.dumps(parameters)
    
    # Insert connection into database
    try:
        db = get_db()
        db.execute(
            '''INSERT INTO field_connections 
               (source_field_id, target_field_id, connection_type, parameters, active)
               VALUES (?, ?, ?, ?, ?)''',
            (source_field_id, target_field_id, connection_type, parameters_json, active)
        )
        db.commit()
        
        flash('Field connection added successfully.', 'success')
    except Exception as e:
        flash(f'Error adding field connection: {str(e)}', 'danger')
    
    return redirect(url_for('admin_connections'))

@app.route('/admin/connections/edit', methods=['POST'])
@admin_required
def edit_field_connection():
    """Edit an existing field connection"""
    if request.method != 'POST':
        return redirect(url_for('admin_connections'))
    
    # Get form data
    connection_id = request.form.get('connection_id')
    source_field_id = request.form.get('source_field_id')
    target_field_id = request.form.get('target_field_id')
    connection_type = request.form.get('connection_type')
    active = 1 if request.form.get('active') else 0
    
    # Build parameters based on connection type
    parameters = {}
    if connection_type == 'custom_formula':
        parameters['formula'] = request.form.get('custom_formula')
    elif connection_type in ['add', 'subtract', 'multiply', 'divide']:
        parameters['value'] = request.form.get('parameter_value')
    
    # Convert parameters to JSON
    parameters_json = json.dumps(parameters)
    
    # Update connection in database
    try:
        db = get_db()
        db.execute(
            '''UPDATE field_connections
               SET source_field_id = ?, target_field_id = ?, connection_type = ?, parameters = ?, active = ?
               WHERE id = ?''',
            (source_field_id, target_field_id, connection_type, parameters_json, active, connection_id)
        )
        db.commit()
        
        flash('Field connection updated successfully.', 'success')
    except Exception as e:
        flash(f'Error updating field connection: {str(e)}', 'danger')
    
    return redirect(url_for('admin_connections'))

@app.route('/admin/connections/delete', methods=['POST'])
@admin_required
def delete_field_connection():
    """Delete a field connection"""
    if request.method != 'POST':
        return redirect(url_for('admin_connections'))
    
    connection_id = request.form.get('connection_id')
    
    try:
        db = get_db()
        db.execute('DELETE FROM field_connections WHERE id = ?', (connection_id,))
        db.commit()
        
        flash('Field connection deleted successfully.', 'success')
    except Exception as e:
        flash(f'Error deleting field connection: {str(e)}', 'danger')
    
    return redirect(url_for('admin_connections'))

@app.route('/admin/suggestions/enable', methods=['POST'])
@admin_required
def enable_field_suggestions():
    """Enable suggestions for a field"""
    if request.method != 'POST':
        return redirect(url_for('admin_connections'))
    
    field_id = request.form.get('field_id')
    
    try:
        db = get_db()
        db.execute('UPDATE form_fields SET suggestions_enabled = 1 WHERE id = ?', (field_id,))
        db.commit()
        
        flash('Field suggestions enabled successfully.', 'success')
    except Exception as e:
        flash(f'Error enabling field suggestions: {str(e)}', 'danger')
    
    return redirect(url_for('admin_connections'))

@app.route('/admin/suggestions/disable', methods=['POST'])
@admin_required
def disable_field_suggestions():
    """Disable suggestions for a field"""
    if request.method != 'POST':
        return redirect(url_for('admin_connections'))
    
    field_id = request.form.get('field_id')
    
    try:
        db = get_db()
        db.execute('UPDATE form_fields SET suggestions_enabled = 0 WHERE id = ?', (field_id,))
        db.commit()
        
        flash('Field suggestions disabled successfully.', 'success')
    except Exception as e:
        flash(f'Error disabling field suggestions: {str(e)}', 'danger')
    
    return redirect(url_for('admin_connections'))

@app.route('/api/form-fields')
def api_form_fields():
    """API endpoint to get form fields"""
    form_id = request.args.get('form_id')
    
    if not form_id:
        return jsonify([])
    
    try:
        fields = get_form_fields(form_id)
        return jsonify([dict(field) for field in fields])
    except Exception as e:
        log_error('api', f'Error getting form fields: {str(e)}')
        return jsonify([])

@app.route('/api/field-connection/<int:connection_id>')
def api_field_connection(connection_id):
    """API endpoint to get field connection details"""
    try:
        db = get_db()
        connection = db.execute(
            '''SELECT c.*, 
                      s.field_name as source_name, s.form_id as source_form,
                      t.field_name as target_name, t.form_id as target_form
               FROM field_connections c
               JOIN form_fields s ON c.source_field_id = s.id
               JOIN form_fields t ON c.target_field_id = t.id
               WHERE c.id = ?''',
            (connection_id,)
        ).fetchone()
        
        if not connection:
            return jsonify({'error': 'Connection not found'}), 404
        
        connection_dict = dict(connection)
        
        # Parse parameters if they exist
        if connection_dict.get('parameters'):
            try:
                connection_dict['parameters'] = json.loads(connection_dict['parameters'])
            except json.JSONDecodeError:
                connection_dict['parameters'] = {}
        else:
            connection_dict['parameters'] = {}
        
        return jsonify(connection_dict)
    except Exception as e:
        log_error('api', f'Error getting field connection: {str(e)}')
        return jsonify({'error': str(e)}), 500

# Initialize database when the app starts
with app.app_context():
    if not os.path.exists(DATABASE):
        init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)