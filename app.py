import os
import datetime
import json
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, SubmitField, SelectField, TextAreaField, DateField, BooleanField
from wtforms.validators import DataRequired, Length, Optional

# App configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
# Use SQLite by default
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///attendance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db = SQLAlchemy(app)

# Define models
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<Admin {self.username}>'

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(200), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # Custom fields stored as JSON
    custom_fields = db.Column(db.Text, nullable=True)  # JSON string
    
    def __repr__(self):
        return f'<Project {self.name}>'
        
    def get_custom_fields(self):
        """Return custom fields as a dictionary"""
        if not self.custom_fields:
            return {}
        try:
            return json.loads(self.custom_fields)
        except:
            return {}
    
    def set_custom_fields(self, fields_dict):
        """Set custom fields from a dictionary"""
        self.custom_fields = json.dumps(fields_dict)

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)
    action = db.Column(db.String(10), nullable=False)  # 'Clock In' or 'Clock Out'
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    photo_path = db.Column(db.String(255), nullable=True)
    
    # Relationship
    project = db.relationship('Project', backref=db.backref('attendances', lazy=True))
    
    def __repr__(self):
        return f'<Attendance {self.employee_id} {self.action} at {self.timestamp}>'

# Define forms
class AttendanceForm(FlaskForm):
    employee_id = StringField('Employee ID', validators=[DataRequired()])
    project_id = SelectField('Project', validators=[Optional()], coerce=int)
    action = SelectField('Action', choices=[('Clock In', 'Clock In'), ('Clock Out', 'Clock Out')], validators=[DataRequired()])
    photo = FileField('Photo (Optional)', validators=[FileAllowed(['jpg', 'jpeg', 'png'], 'Images only!')])
    submit = SubmitField('Submit')

class AdminLoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')
    
class ProjectForm(FlaskForm):
    name = StringField('Project Name', validators=[DataRequired(), Length(min=2, max=100)])
    description = TextAreaField('Description', validators=[Optional()])
    location = StringField('Location', validators=[Optional(), Length(max=200)])
    start_date = DateField('Start Date', validators=[Optional()], format='%Y-%m-%d')
    end_date = DateField('End Date', validators=[Optional()], format='%Y-%m-%d')
    active = BooleanField('Active', default=True)
    custom_fields = TextAreaField('Custom Fields (JSON)', validators=[Optional()])
    submit = SubmitField('Save Project')
    
class CustomFieldForm(FlaskForm):
    field_name = StringField('Field Name', validators=[DataRequired(), Length(min=1, max=50)])
    field_type = SelectField('Field Type', choices=[
        ('text', 'Text'), 
        ('number', 'Number'), 
        ('date', 'Date'),
        ('boolean', 'Yes/No'),
        ('select', 'Selection')
    ], validators=[DataRequired()])
    field_options = TextAreaField('Options (comma separated, for Selection type)', validators=[Optional()])
    submit = SubmitField('Add Field')

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}

# Decorator for admin routes
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_id' not in session:
            flash('Please log in to access this page.', 'danger')
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Create database if it doesn't exist
with app.app_context():
    db.create_all()
    # Create an admin user if none exists
    if not Admin.query.first():
        admin = Admin(username='admin')
        admin.set_password('admin')  # Change this in production!
        db.session.add(admin)
        db.session.commit()

# Pass current date to all templates
@app.context_processor
def inject_now():
    return {'now': datetime.datetime.utcnow()}

# Routes
@app.route('/')
def index():
    """Main page with clock in/out form"""
    form = AttendanceForm()
    
    # Populate project dropdown with active projects
    active_projects = Project.query.filter_by(active=True).order_by(Project.name).all()
    form.project_id.choices = [(0, '-- Select Project --')] + [(p.id, p.name) for p in active_projects]
    
    # Get project list for display
    projects = Project.query.order_by(Project.name).all()
    
    return render_template('index.html', form=form, projects=projects)

@app.route('/submit', methods=['POST'])
def submit():
    """Handle attendance form submission"""
    form = AttendanceForm()
    
    # Populate project dropdown for validation
    active_projects = Project.query.filter_by(active=True).order_by(Project.name).all()
    form.project_id.choices = [(0, '-- Select Project --')] + [(p.id, p.name) for p in active_projects]
    
    if form.validate_on_submit():
        employee_id = form.employee_id.data
        project_id = form.project_id.data if form.project_id.data != 0 else None
        action = form.action.data
        latitude = request.form.get('latitude', type=float)
        longitude = request.form.get('longitude', type=float)
        
        # Check for duplicate entries (same employee, same action within 15 minutes)
        recent_record = Attendance.query.filter_by(
            employee_id=employee_id, 
            action=action
        ).order_by(Attendance.timestamp.desc()).first()
        
        if recent_record and (datetime.datetime.utcnow() - recent_record.timestamp).total_seconds() < 900:  # 15 minutes
            flash(f'You already {action.lower()}ed recently. Please try again later.', 'warning')
            return redirect(url_for('index'))
        
        # Handle photo upload
        photo_path = None
        if form.photo.data:
            photo = form.photo.data
            if photo and allowed_file(photo.filename):
                filename = secure_filename(f"{employee_id}_{action.replace(' ', '')}_{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}.{photo.filename.rsplit('.', 1)[1].lower()}")
                photo_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                photo.save(photo_path)
        
        # Create new attendance record
        attendance = Attendance(
            employee_id=employee_id,
            project_id=project_id,
            action=action,
            latitude=latitude,
            longitude=longitude,
            photo_path=photo_path
        )
        db.session.add(attendance)
        db.session.commit()
        
        # Get project name for the message
        project_name = ''
        if project_id:
            project = Project.query.get(project_id)
            if project:
                project_name = f" at project '{project.name}'"
        
        flash(f'Successfully recorded {action}{project_name} for Employee ID: {employee_id}', 'success')
        return redirect(url_for('index'))
    
    # If we get here, there was a form validation error
    for field, errors in form.errors.items():
        for error in errors:
            flash(f"{getattr(form, field).label.text}: {error}", 'danger')
    
    return redirect(url_for('index'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    # Redirect if already logged in
    if 'admin_id' in session:
        return redirect(url_for('admin_dashboard'))
    
    form = AdminLoginForm()
    if form.validate_on_submit():
        admin = Admin.query.filter_by(username=form.username.data).first()
        if admin and admin.check_password(form.password.data):
            session['admin_id'] = admin.id
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password', 'danger')
    
    return render_template('admin_login.html', form=form)

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_id', None)
    flash('You have been logged out.', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
@admin_required
def admin_dashboard():
    """Admin dashboard to view attendance records"""
    page = request.args.get('page', 1, type=int)
    per_page = 10  # Records per page
    
    # Get filters
    date_filter = request.args.get('date')
    employee_filter = request.args.get('employee_id')
    project_filter = request.args.get('project_id', type=int)
    
    # Base query
    query = Attendance.query
    
    # Apply filters
    if date_filter:
        date_obj = datetime.datetime.strptime(date_filter, '%Y-%m-%d').date()
        next_day = date_obj + datetime.timedelta(days=1)
        query = query.filter(
            Attendance.timestamp >= date_obj,
            Attendance.timestamp < next_day
        )
    
    if employee_filter:
        query = query.filter_by(employee_id=employee_filter)
        
    if project_filter:
        query = query.filter_by(project_id=project_filter)
    
    # Get paginated records
    records = query.order_by(Attendance.timestamp.desc()).paginate(page=page, per_page=per_page)
    
    # Get unique employee IDs for filter dropdown
    employee_ids = db.session.query(Attendance.employee_id).distinct().order_by(Attendance.employee_id).all()
    employee_ids = [emp[0] for emp in employee_ids]  # Convert from tuples to strings
    
    # Get projects for filter dropdown
    projects = Project.query.order_by(Project.name).all()
    
    return render_template('admin_dashboard.html', 
                           records=records, 
                           employee_ids=employee_ids,
                           projects=projects,
                           current_filters={
                               'date': date_filter,
                               'employee_id': employee_filter,
                               'project_id': project_filter
                           })

@app.route('/admin/projects')
@admin_required
def admin_projects():
    """Projects management page"""
    page = request.args.get('page', 1, type=int)
    per_page = 10  # Projects per page
    
    # Get all projects with pagination
    projects = Project.query.order_by(Project.created_at.desc()).paginate(page=page, per_page=per_page)
    
    return render_template('admin_projects.html', projects=projects)

@app.route('/admin/projects/add', methods=['GET', 'POST'])
@admin_required
def add_project():
    """Add a new project"""
    form = ProjectForm()
    
    if form.validate_on_submit():
        # Create new project
        project = Project(
            name=form.name.data,
            description=form.description.data,
            location=form.location.data,
            start_date=form.start_date.data,
            end_date=form.end_date.data,
            active=form.active.data
        )
        
        # Parse custom fields if provided
        if form.custom_fields.data:
            try:
                custom_fields = json.loads(form.custom_fields.data)
                project.set_custom_fields(custom_fields)
            except json.JSONDecodeError:
                flash('Invalid JSON format for custom fields', 'danger')
                return render_template('project_form.html', form=form, title='Add Project')
        
        db.session.add(project)
        db.session.commit()
        
        flash(f'Project "{project.name}" added successfully!', 'success')
        return redirect(url_for('admin_projects'))
    
    return render_template('project_form.html', form=form, title='Add Project')

@app.route('/admin/projects/<int:project_id>/edit', methods=['GET', 'POST'])
@admin_required
def edit_project(project_id):
    """Edit an existing project"""
    project = Project.query.get_or_404(project_id)
    form = ProjectForm(obj=project)
    
    if request.method == 'GET':
        # For GET requests, populate the custom fields from the database
        form.custom_fields.data = json.dumps(project.get_custom_fields(), indent=2)
    
    if form.validate_on_submit():
        # Update project details
        project.name = form.name.data
        project.description = form.description.data
        project.location = form.location.data
        project.start_date = form.start_date.data
        project.end_date = form.end_date.data
        project.active = form.active.data
        
        # Parse custom fields if provided
        if form.custom_fields.data:
            try:
                custom_fields = json.loads(form.custom_fields.data)
                project.set_custom_fields(custom_fields)
            except json.JSONDecodeError:
                flash('Invalid JSON format for custom fields', 'danger')
                return render_template('project_form.html', form=form, project=project, title='Edit Project')
        else:
            project.custom_fields = None
        
        db.session.commit()
        
        flash(f'Project "{project.name}" updated successfully!', 'success')
        return redirect(url_for('admin_projects'))
    
    return render_template('project_form.html', form=form, project=project, title='Edit Project')

@app.route('/admin/projects/<int:project_id>/delete', methods=['POST'])
@admin_required
def delete_project(project_id):
    """Delete a project"""
    project = Project.query.get_or_404(project_id)
    
    # Check if any attendance records reference this project
    attendance_count = Attendance.query.filter_by(project_id=project.id).count()
    if attendance_count > 0:
        flash(f'Cannot delete project "{project.name}" because it has {attendance_count} attendance records.', 'danger')
        return redirect(url_for('admin_projects'))
    
    project_name = project.name
    db.session.delete(project)
    db.session.commit()
    
    flash(f'Project "{project_name}" deleted successfully!', 'success')
    return redirect(url_for('admin_projects'))

@app.route('/admin/projects/<int:project_id>/fields', methods=['GET', 'POST'])
@admin_required
def manage_custom_fields(project_id):
    """Manage custom fields for a project"""
    project = Project.query.get_or_404(project_id)
    form = CustomFieldForm()
    
    if form.validate_on_submit():
        field_name = form.field_name.data
        field_type = form.field_type.data
        
        # Get current custom fields
        custom_fields = project.get_custom_fields()
        
        # Create field definition
        field_def = {
            'type': field_type
        }
        
        # Add options for select type
        if field_type == 'select' and form.field_options.data:
            options = [option.strip() for option in form.field_options.data.split(',') if option.strip()]
            field_def['options'] = options
        
        # Add the new field
        custom_fields[field_name] = field_def
        
        # Save back to the project
        project.set_custom_fields(custom_fields)
        db.session.commit()
        
        flash(f'Field "{field_name}" added to project "{project.name}"', 'success')
        return redirect(url_for('manage_custom_fields', project_id=project.id))
    
    # Get current fields for display
    current_fields = project.get_custom_fields()
    
    return render_template('project_fields.html', 
                          project=project, 
                          form=form, 
                          current_fields=current_fields)

@app.route('/admin/projects/<int:project_id>/fields/<field_name>/delete', methods=['POST'])
@admin_required
def delete_custom_field(project_id, field_name):
    """Delete a custom field from a project"""
    project = Project.query.get_or_404(project_id)
    
    # Get current custom fields
    custom_fields = project.get_custom_fields()
    
    if field_name in custom_fields:
        # Remove the field
        del custom_fields[field_name]
        
        # Save back to the project
        project.set_custom_fields(custom_fields)
        db.session.commit()
        
        flash(f'Field "{field_name}" removed from project "{project.name}"', 'success')
    else:
        flash(f'Field "{field_name}" not found', 'danger')
    
    return redirect(url_for('manage_custom_fields', project_id=project.id))

@app.route('/uploads/<filename>')
@admin_required
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# API Endpoints for mobile app
@app.route('/api/submit', methods=['POST'])
def api_submit():
    """API endpoint for submitting attendance records"""
    # Get data from request
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
    
    employee_id = data.get('employee_id')
    action = data.get('action')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if not employee_id or not action:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    # Check for duplicate entries
    recent_record = Attendance.query.filter_by(
        employee_id=employee_id, 
        action=action
    ).order_by(Attendance.timestamp.desc()).first()
    
    if recent_record and (datetime.datetime.utcnow() - recent_record.timestamp).total_seconds() < 900:  # 15 minutes
        return jsonify({
            "success": False, 
            "message": f"You already {action.lower()}ed recently. Please try again later."
        }), 429
    
    # Create new attendance record
    attendance = Attendance(
        employee_id=employee_id,
        action=action,
        latitude=latitude,
        longitude=longitude
    )
    db.session.add(attendance)
    db.session.commit()
    
    return jsonify({
        "success": True, 
        "message": f"Successfully recorded {action} for Employee ID: {employee_id}"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)