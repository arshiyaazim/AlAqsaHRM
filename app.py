#!/usr/bin/env python3
import os
import sqlite3
import datetime
import json
import uuid
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory, abort

# Initialize Flask app
app = Flask(__name__)
app.secret_key = 'al-aqsa-security-attendance-123'

# Configure file uploads
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Database path
DB_PATH = 'attendance.db'

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Database Initialization
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create Admin table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL
    )
    ''')
    
    # Create Project table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS project (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        location TEXT,
        start_date DATE,
        end_date DATE,
        active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        custom_fields TEXT
    )
    ''')
    
    # Create Attendance table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        project_id INTEGER,
        action TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        latitude REAL,
        longitude REAL,
        photo_path TEXT,
        FOREIGN KEY (project_id) REFERENCES project (id)
    )
    ''')
    
    # Check if admin already exists, if not create default admin
    cursor.execute("SELECT COUNT(*) FROM admin")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO admin (username, password_hash) VALUES (?, ?)",
            ("admin", generate_password_hash("admin123"))
        )
    
    conn.commit()
    conn.close()

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            flash('Please log in first.', 'error')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

def get_projects():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM project WHERE active = 1 ORDER BY name")
    projects = cursor.fetchall()
    conn.close()
    return projects

def inject_now():
    return {'now': datetime.datetime.utcnow()}

app.jinja_env.globals.update(now=inject_now)

# Routes
@app.route('/')
def index():
    """Main page with clock in/out form"""
    projects = get_projects()
    return render_template('index.html', projects=projects)

@app.route('/submit', methods=['POST'])
def submit():
    """Handle attendance form submission"""
    employee_id = request.form.get('employee_id')
    project_id = request.form.get('project_id')
    action = request.form.get('action')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    
    # Validate required fields
    if not employee_id:
        flash('Employee ID is required', 'error')
        return redirect(url_for('index'))
    
    if not action or action not in ['Clock In', 'Clock Out']:
        flash('Valid action is required', 'error')
        return redirect(url_for('index'))
    
    # Check for duplicate entries (same employee, same action, within 5 minutes)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get timestamp 5 minutes ago
    five_min_ago = (datetime.datetime.utcnow() - datetime.timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute(
        "SELECT * FROM attendance WHERE employee_id = ? AND action = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 1",
        (employee_id, action, five_min_ago)
    )
    recent_attendance = cursor.fetchone()
    
    if recent_attendance:
        flash(f'You have already {action.lower()}ed recently. Please try again later.', 'error')
        conn.close()
        return redirect(url_for('index'))
    
    # Process photo if uploaded
    photo_path = None
    if 'photo' in request.files:
        photo_file = request.files['photo']
        if photo_file and photo_file.filename and allowed_file(photo_file.filename):
            # Generate unique filename with uuid
            _, ext = os.path.splitext(photo_file.filename)
            filename = f"{uuid.uuid4().hex}{ext}"
            photo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            photo_file.save(photo_path)
            photo_path = filename  # Store only the filename in the database
    
    # Save attendance record
    cursor.execute(
        "INSERT INTO attendance (employee_id, project_id, action, latitude, longitude, photo_path) VALUES (?, ?, ?, ?, ?, ?)",
        (employee_id, project_id if project_id else None, action, latitude, longitude, photo_path)
    )
    
    conn.commit()
    conn.close()
    
    flash(f'Successfully {action.lower()}ed!', 'success')
    return redirect(url_for('index'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Username and password are required', 'error')
            return redirect(url_for('admin_login'))
        
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM admin WHERE username = ?", (username,))
        admin = cursor.fetchone()
        conn.close()
        
        if admin and check_password_hash(admin['password_hash'], password):
            session['admin_id'] = admin['id']
            session['admin_username'] = admin['username']
            flash('Successfully logged in!', 'success')
            return redirect(url_for('admin_dashboard'))
        
        flash('Invalid username or password', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_id', None)
    session.pop('admin_username', None)
    flash('You have been logged out', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    """Admin dashboard to view attendance records"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get parameters for filtering
    date_filter = request.args.get('date', datetime.datetime.now().strftime('%Y-%m-%d'))
    employee_filter = request.args.get('employee_id', '')
    project_filter = request.args.get('project_id', '')
    
    # Build query
    query = "SELECT a.*, p.name as project_name FROM attendance a LEFT JOIN project p ON a.project_id = p.id WHERE 1=1"
    params = []
    
    if date_filter:
        query += " AND date(a.timestamp) = ?"
        params.append(date_filter)
    
    if employee_filter:
        query += " AND a.employee_id = ?"
        params.append(employee_filter)
    
    if project_filter:
        query += " AND a.project_id = ?"
        params.append(project_filter)
    
    query += " ORDER BY a.timestamp DESC"
    
    cursor.execute(query, params)
    attendances = cursor.fetchall()
    
    # Get projects for the filter dropdown
    projects = get_projects()
    
    # Get unique employee IDs
    cursor.execute("SELECT DISTINCT employee_id FROM attendance ORDER BY employee_id")
    employees = cursor.fetchall()
    
    conn.close()
    
    return render_template(
        'admin_dashboard.html', 
        attendances=attendances, 
        projects=projects,
        employees=employees,
        date_filter=date_filter,
        employee_filter=employee_filter,
        project_filter=project_filter
    )

@app.route('/admin/projects')
@admin_required
def admin_projects():
    """Projects management page"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM project ORDER BY name")
    projects = cursor.fetchall()
    
    conn.close()
    
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
        active = 'active' in request.form
        custom_fields = request.form.get('custom_fields', '{}')
        
        # Validate required fields
        if not name:
            flash('Project name is required', 'error')
            return redirect(url_for('add_project'))
        
        # Validate JSON format of custom fields if provided
        if custom_fields.strip():
            try:
                json.loads(custom_fields)
            except json.JSONDecodeError:
                flash('Custom fields must be valid JSON', 'error')
                return redirect(url_for('add_project'))
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            """
            INSERT INTO project 
            (name, description, location, start_date, end_date, active, custom_fields) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (name, description, location, start_date, end_date, active, custom_fields)
        )
        
        conn.commit()
        conn.close()
        
        flash('Project added successfully!', 'success')
        return redirect(url_for('admin_projects'))
    
    return render_template('project_form.html', project=None)

@app.route('/admin/projects/<int:project_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_project(project_id):
    """Edit an existing project"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM project WHERE id = ?", (project_id,))
    project = cursor.fetchone()
    
    if not project:
        conn.close()
        flash('Project not found', 'error')
        return redirect(url_for('admin_projects'))
    
    if request.method == 'POST':
        name = request.form.get('name')
        description = request.form.get('description', '')
        location = request.form.get('location', '')
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        active = 'active' in request.form
        custom_fields = request.form.get('custom_fields', '{}')
        
        # Validate required fields
        if not name:
            flash('Project name is required', 'error')
            return redirect(url_for('edit_project', project_id=project_id))
        
        # Validate JSON format of custom fields if provided
        if custom_fields.strip():
            try:
                json.loads(custom_fields)
            except json.JSONDecodeError:
                flash('Custom fields must be valid JSON', 'error')
                return redirect(url_for('edit_project', project_id=project_id))
        
        cursor.execute(
            """
            UPDATE project 
            SET name = ?, description = ?, location = ?, start_date = ?, end_date = ?, 
                active = ?, custom_fields = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
            """,
            (name, description, location, start_date, end_date, active, custom_fields, project_id)
        )
        
        conn.commit()
        conn.close()
        
        flash('Project updated successfully!', 'success')
        return redirect(url_for('admin_projects'))
    
    conn.close()
    return render_template('project_form.html', project=project)

@app.route('/admin/projects/<int:project_id>/delete', methods=['POST'])
@admin_required
def delete_project(project_id):
    """Delete a project"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if the project exists
    cursor.execute("SELECT id FROM project WHERE id = ?", (project_id,))
    project = cursor.fetchone()
    
    if not project:
        conn.close()
        flash('Project not found', 'error')
        return redirect(url_for('admin_projects'))
    
    # Check if the project is used in attendance records
    cursor.execute("SELECT COUNT(*) FROM attendance WHERE project_id = ?", (project_id,))
    if cursor.fetchone()[0] > 0:
        # Project is in use, so just mark as inactive instead of deleting
        cursor.execute(
            "UPDATE project SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (project_id,)
        )
        conn.commit()
        conn.close()
        flash('Project marked as inactive because it has attendance records', 'warning')
    else:
        # Project not in use, safe to delete
        cursor.execute("DELETE FROM project WHERE id = ?", (project_id,))
        conn.commit()
        conn.close()
        flash('Project deleted successfully!', 'success')
    
    return redirect(url_for('admin_projects'))

@app.route('/admin/projects/<int:project_id>/fields', methods=['GET', 'POST'])
@admin_required
def manage_custom_fields(project_id):
    """Manage custom fields for a project"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM project WHERE id = ?", (project_id,))
    project = cursor.fetchone()
    
    if not project:
        conn.close()
        flash('Project not found', 'error')
        return redirect(url_for('admin_projects'))
    
    if request.method == 'POST':
        field_name = request.form.get('field_name')
        field_type = request.form.get('field_type')
        field_options = request.form.get('field_options', '')
        
        if not field_name or not field_type:
            flash('Field name and type are required', 'error')
            return redirect(url_for('manage_custom_fields', project_id=project_id))
        
        # Get current custom fields
        custom_fields = json.loads(project['custom_fields'] or '{}')
        
        # Add new field
        custom_fields[field_name] = {
            'type': field_type,
            'options': field_options.split(',') if field_type == 'select' and field_options else None
        }
        
        # Update project with new fields
        cursor.execute(
            "UPDATE project SET custom_fields = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (json.dumps(custom_fields), project_id)
        )
        
        conn.commit()
        conn.close()
        
        flash('Custom field added successfully!', 'success')
        return redirect(url_for('manage_custom_fields', project_id=project_id))
    
    # Get current custom fields
    custom_fields = json.loads(project['custom_fields'] or '{}')
    
    conn.close()
    return render_template('project_fields.html', project=project, custom_fields=custom_fields)

@app.route('/admin/projects/<int:project_id>/fields/<field_name>/delete', methods=['POST'])
@admin_required
def delete_custom_field(project_id, field_name):
    """Delete a custom field from a project"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM project WHERE id = ?", (project_id,))
    project = cursor.fetchone()
    
    if not project:
        conn.close()
        flash('Project not found', 'error')
        return redirect(url_for('admin_projects'))
    
    # Get current custom fields
    custom_fields = json.loads(project['custom_fields'] or '{}')
    
    # Remove field if it exists
    if field_name in custom_fields:
        del custom_fields[field_name]
        
        # Update project with new fields
        cursor.execute(
            "UPDATE project SET custom_fields = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (json.dumps(custom_fields), project_id)
        )
        
        conn.commit()
        flash('Custom field deleted successfully!', 'success')
    else:
        flash('Custom field not found', 'error')
    
    conn.close()
    return redirect(url_for('manage_custom_fields', project_id=project_id))

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# API Endpoints
@app.route('/api/submit', methods=['POST'])
def api_submit():
    """API endpoint for submitting attendance records"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'employee_id' not in data or 'action' not in data:
            return jsonify({'success': False, 'message': 'Employee ID and action are required'}), 400
        
        employee_id = data['employee_id']
        action = data['action']
        project_id = data.get('project_id')
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if action not in ['Clock In', 'Clock Out']:
            return jsonify({'success': False, 'message': 'Action must be either "Clock In" or "Clock Out"'}), 400
        
        # Check for duplicate entries (same employee, same action, within 5 minutes)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get timestamp 5 minutes ago
        five_min_ago = (datetime.datetime.utcnow() - datetime.timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M:%S")
        
        cursor.execute(
            "SELECT * FROM attendance WHERE employee_id = ? AND action = ? AND timestamp > ? ORDER BY timestamp DESC LIMIT 1",
            (employee_id, action, five_min_ago)
        )
        recent_attendance = cursor.fetchone()
        
        if recent_attendance:
            conn.close()
            return jsonify({
                'success': False, 
                'message': f'You have already {action.lower()}ed recently. Please try again later.'
            }), 429
        
        # Save attendance record
        cursor.execute(
            "INSERT INTO attendance (employee_id, project_id, action, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
            (employee_id, project_id, action, latitude, longitude)
        )
        
        conn.commit()
        
        # Get the inserted record
        cursor.execute(
            "SELECT a.*, p.name as project_name FROM attendance a LEFT JOIN project p ON a.project_id = p.id WHERE a.id = last_insert_rowid()"
        )
        attendance = dict(cursor.fetchone())
        
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Successfully {action.lower()}ed!',
            'attendance': attendance
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Initialize the database and run the app if executed directly
if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)