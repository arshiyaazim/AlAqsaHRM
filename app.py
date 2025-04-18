"""
Al-Aqsa Security - Mobile Attendance Tracking Application
Flask-based web application with Progressive Web App (PWA) support
"""

import os
import sqlite3
import json
import datetime
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from flask import (
    Flask, render_template, request, redirect, url_for, 
    flash, jsonify, session, g, send_from_directory
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

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database connection
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            DATABASE,
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
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

@app.cli.command('init-db')
def init_db_command():
    """Clear existing data and create new tables."""
    init_db()
    print('Initialized the database.')

def allowed_file(filename):
    """Check if a file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def admin_required(f):
    """Decorator to require admin login for routes."""
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            flash('Please log in as admin to access this page.', 'warning')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def get_projects():
    """Get all active projects from database."""
    db = get_db()
    return db.execute('SELECT * FROM projects WHERE active = 1').fetchall()

@app.context_processor
def inject_now():
    """Add current datetime to template context."""
    return {'now': datetime.datetime.now()}

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

# API routes
@app.route('/api/submit', methods=['POST'])
def api_submit():
    """API endpoint for submitting attendance records"""
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('employee_id') or not data.get('action'):
            return jsonify({'error': 'Employee ID and action are required'}), 400
        
        # Insert record into database
        db = get_db()
        
        # Check for duplicate entry (same employee, same action, same day)
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        duplicate = db.execute('''
            SELECT id FROM attendance 
            WHERE employee_id = ? AND action = ? AND date(timestamp) = date(?)
        ''', (data.get('employee_id'), data.get('action'), today)).fetchone()
        
        if duplicate:
            return jsonify({'error': 'Duplicate entry. Already recorded today.'}), 400
        
        # Get project details if provided
        project_name = None
        if data.get('project_id'):
            project = db.execute('SELECT name FROM projects WHERE id = ?', (data.get('project_id'),)).fetchone()
            if project:
                project_name = project['name']
        
        # Insert attendance record
        db.execute('''
            INSERT INTO attendance (employee_id, action, project_id, project_name, latitude, longitude)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data.get('employee_id'), 
            data.get('action'), 
            data.get('project_id'), 
            project_name,
            data.get('latitude'), 
            data.get('longitude')
        ))
        db.commit()
        
        return jsonify({'success': True, 'message': f'Successfully {data.get("action").lower()}ed'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Initialize database when the app starts
with app.app_context():
    if not os.path.exists(DATABASE):
        init_db()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)