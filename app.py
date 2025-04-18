import os
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, PasswordField, SubmitField, SelectField
from wtforms.validators import DataRequired

# App configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///attendance.db')
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

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(10), nullable=False)  # 'Clock In' or 'Clock Out'
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    photo_path = db.Column(db.String(255), nullable=True)
    
    def __repr__(self):
        return f'<Attendance {self.employee_id} {self.action} at {self.timestamp}>'

# Define forms
class AttendanceForm(FlaskForm):
    employee_id = StringField('Employee ID', validators=[DataRequired()])
    action = SelectField('Action', choices=[('Clock In', 'Clock In'), ('Clock Out', 'Clock Out')], validators=[DataRequired()])
    photo = FileField('Photo (Optional)', validators=[FileAllowed(['jpg', 'jpeg', 'png'], 'Images only!')])
    submit = SubmitField('Submit')

class AdminLoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

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

# Routes
@app.route('/')
def index():
    """Main page with clock in/out form"""
    form = AttendanceForm()
    return render_template('index.html', form=form)

@app.route('/submit', methods=['POST'])
def submit():
    """Handle attendance form submission"""
    form = AttendanceForm()
    
    if form.validate_on_submit():
        employee_id = form.employee_id.data
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
            action=action,
            latitude=latitude,
            longitude=longitude,
            photo_path=photo_path
        )
        db.session.add(attendance)
        db.session.commit()
        
        flash(f'Successfully recorded {action} for Employee ID: {employee_id}', 'success')
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
    
    # Get paginated records
    records = query.order_by(Attendance.timestamp.desc()).paginate(page=page, per_page=per_page)
    
    # Get unique employee IDs for filter dropdown
    employee_ids = db.session.query(Attendance.employee_id).distinct().order_by(Attendance.employee_id).all()
    employee_ids = [emp[0] for emp in employee_ids]  # Convert from tuples to strings
    
    return render_template('admin_dashboard.html', records=records, employee_ids=employee_ids)

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
    app.run(host='0.0.0.0', port=5000, debug=True)