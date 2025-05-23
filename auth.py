"""
Authentication module for the Flask application.
Handles user login, logout, and session management.
"""
from flask import Blueprint, request, session, jsonify, g
from functools import wraps
from datetime import datetime, timedelta
from models import User, db
import app_config

# Create a blueprint for authentication routes
auth_bp = Blueprint('auth', __name__)

# Session configuration constants
SESSION_USER_ID = 'user_id'
SESSION_ROLE = 'role'
SESSION_EXPIRES = 'session_expires'

def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not is_authenticated():
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(roles):
    """Decorator to require specific role(s) for routes."""
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated_function(*args, **kwargs):
            user_role = session.get(SESSION_ROLE)
            if user_role not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def is_authenticated():
    """Check if the current session is authenticated."""
    if SESSION_USER_ID in session:
        # Check if the session has expired
        if SESSION_EXPIRES in session:
            expiry = datetime.fromisoformat(session[SESSION_EXPIRES])
            if expiry < datetime.utcnow():
                # Session has expired, clear it
                session.clear()
                return False
            # Update session expiry time
            set_session_expiry()
            return True
    return False

def get_current_user():
    """Get the currently logged in user."""
    if is_authenticated():
        user_id = session.get(SESSION_USER_ID)
        if not hasattr(g, 'current_user'):
            g.current_user = User.query.get(user_id)
        return g.current_user
    return None

def set_session_expiry():
    """Set the session expiry time."""
    expiry = datetime.utcnow() + timedelta(seconds=app_config.SESSION_TIMEOUT)
    session[SESSION_EXPIRES] = expiry.isoformat()

@auth_bp.route('/api/login', methods=['POST'])
def login():
    """Login route that handles POST requests with username/email and password."""
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    username_or_email = data.get('username') or data.get('email')
    password = data.get('password')
    
    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required"}), 400
    
    # Try to find the user by username or email
    user = User.query.filter(
        (User.username == username_or_email) | (User.email == username_or_email)
    ).first()
    
    if user and user.check_password(password):
        # Clear any existing session
        session.clear()
        
        # Set session data
        session[SESSION_USER_ID] = user.id
        session[SESSION_ROLE] = user.role
        set_session_expiry()
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        })
    
    return jsonify({"error": "Invalid credentials"}), 401

@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    """Logout route that clears the session."""
    session.clear()
    return jsonify({"message": "Logout successful"})

@auth_bp.route('/api/user', methods=['GET'])
@login_required
def user_info():
    """Get the current user's information."""
    user = get_current_user()
    return jsonify(user.to_dict())

# Function to initialize authentication for the Flask app
def init_auth(app):
    """Initialize authentication for the Flask app."""
    app.register_blueprint(auth_bp)

def init_db():
    """
    Initialize the database with default users.
    Creates admin, HR, and viewer users if they don't exist.
    """
    # Create default users if they don't exist
    def create_user_if_not_exists(username, email, password, role):
        user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        
        if not user:
            user = User(username=username, email=email, password=password, role=role)
            db.session.add(user)
            print(f"Created {role} user: {username}")
            return True
        return False
    
    # Create admin user
    created_admin = create_user_if_not_exists(
        app_config.ADMIN_USERNAME,
        app_config.ADMIN_EMAIL,
        app_config.ADMIN_PASSWORD,
        app_config.ADMIN_ROLE
    )
    
    # Create HR user
    created_hr = create_user_if_not_exists(
        app_config.HR_USERNAME,
        app_config.HR_EMAIL,
        app_config.HR_PASSWORD,
        app_config.HR_ROLE
    )
    
    # Create viewer user
    created_viewer = create_user_if_not_exists(
        app_config.VIEWER_USERNAME,
        app_config.VIEWER_EMAIL,
        app_config.VIEWER_PASSWORD,
        app_config.VIEWER_ROLE
    )
    
    # Commit changes to database if any users were created
    if created_admin or created_hr or created_viewer:
        db.session.commit()