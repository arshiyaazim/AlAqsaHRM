"""
Initialization module for the Flask application.
Sets up the Flask app, database, and authentication.
"""
import os
from flask import Flask
from flask_cors import CORS
from models import db
from auth import init_auth, init_db

# Create and configure the Flask app
app = Flask(__name__, static_folder='client/dist', static_url_path='/')

# Configure the app from config module
def configure_app(app):
    """Configure the Flask app from configuration."""
    import app_config
    
    # Set config values from app_config
    app.config['SECRET_KEY'] = app_config.SECRET_KEY
    app.config['DEBUG'] = app_config.DEBUG
    
    # Database configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = app_config.DATABASE_URL
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Session configuration
    app.config['SESSION_COOKIE_SECURE'] = app_config.SESSION_COOKIE_SECURE
    app.config['SESSION_COOKIE_HTTPONLY'] = app_config.SESSION_COOKIE_HTTPONLY
    app.config['SESSION_COOKIE_SAMESITE'] = app_config.SESSION_COOKIE_SAMESITE
    
    # CORS configuration - allow credentials for session cookies
    origins = app_config.CORS_ORIGINS
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

# Initialize the app
configure_app(app)

# Initialize the database
db.init_app(app)

# Initialize authentication
init_auth(app)

# Ensure the instance folder exists
os.makedirs(app.instance_path, exist_ok=True)

# Create database tables and seed initial data
with app.app_context():
    db.create_all()
    init_db()

# Import routes after app is created to avoid circular imports
from app import setup_routes
setup_routes(app)