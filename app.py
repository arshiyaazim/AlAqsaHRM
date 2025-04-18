import os
import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'  # Change this to a random string in production

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///attendance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Configure file uploads
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Create uploads directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Database models
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

# Admin user hardcoded for simplicity
# In a production environment, you would use a proper user model and authentication system
ADMIN_USERNAME = 'admin'
ADMIN_PASSWORD = generate_password_hash('admin123')

# Initialize the database
with app.app_context():
    db.create_all()

# Utility functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    """Main page with clock in/out form"""
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    """Handle attendance form submission"""
    employee_id = request.form.get('employee_id')
    action = request.form.get('action')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    
    if not employee_id:
        flash('Employee ID is required', 'danger')
        return redirect(url_for('index'))
    
    # Check for duplicate entries (prevent multiple clock ins within 1 hour)
    one_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(hours=1)
    recent_entry = Attendance.query.filter_by(
        employee_id=employee_id, 
        action=action
    ).filter(
        Attendance.timestamp > one_hour_ago
    ).first()
    
    if recent_entry:
        flash(f'You already {action.lower()}ed within the last hour', 'warning')
        return redirect(url_for('index'))
    
    # Handle photo upload
    photo_path = None
    if 'photo' in request.files:
        photo = request.files['photo']
        if photo.filename != '' and allowed_file(photo.filename):
            filename = secure_filename(f"{employee_id}_{action}_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{photo.filename.rsplit('.', 1)[1].lower()}")
            photo.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            photo_path = filename
    
    # Convert latitude and longitude to float if present
    lat = float(latitude) if latitude else None
    lng = float(longitude) if longitude else None
    
    # Create attendance record
    attendance = Attendance(
        employee_id=employee_id,
        action=action,
        latitude=lat,
        longitude=lng,
        photo_path=photo_path
    )
    
    db.session.add(attendance)
    db.session.commit()
    
    flash(f'Successfully {action.lower()}ed!', 'success')
    return redirect(url_for('index'))

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    """Admin login page"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and check_password_hash(ADMIN_PASSWORD, password):
            session['admin_logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        flash('Invalid credentials', 'danger')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    """Admin logout"""
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin_login'))

@app.route('/admin')
@admin_required
def admin_dashboard():
    """Admin dashboard to view attendance records"""
    date_filter = request.args.get('date')
    employee_filter = request.args.get('employee_id')
    
    query = Attendance.query
    
    if date_filter:
        date_obj = datetime.datetime.strptime(date_filter, '%Y-%m-%d')
        next_day = date_obj + datetime.timedelta(days=1)
        query = query.filter(Attendance.timestamp >= date_obj, Attendance.timestamp < next_day)
    
    if employee_filter:
        query = query.filter_by(employee_id=employee_filter)
    
    # Get all unique employee IDs for the filter dropdown
    employee_ids = db.session.query(Attendance.employee_id).distinct().all()
    employee_ids = [e[0] for e in employee_ids]
    
    # Get the records with pagination
    page = request.args.get('page', 1, type=int)
    per_page = 20
    records = query.order_by(Attendance.timestamp.desc()).paginate(page=page, per_page=per_page)
    
    return render_template(
        'admin_dashboard.html', 
        records=records, 
        employee_ids=employee_ids
    )

@app.route('/uploads/<filename>')
@admin_required
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)