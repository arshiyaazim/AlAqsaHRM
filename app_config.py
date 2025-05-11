"""
Field Attendance Tracker - Application Configuration

This file handles application configuration including database setup.
"""
import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from models import db, init_db_models
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration constants
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Configure database - handle both SQLite and PostgreSQL
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///instance/attendance.db')
    
    # Fix for Render.com postgres:// vs postgresql:// URL format
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    
    # Ensure upload folder exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    # Initialize database with app
    db.init_app(app)
    
    # Ensure required directories exist
    os.makedirs('logs', exist_ok=True)
    os.makedirs('exports', exist_ok=True)
    os.makedirs('instance', exist_ok=True)
    
    # Create database tables and admin user
    with app.app_context():
        try:
            init_db_models()
            logging.info("Database initialized successfully with SQLAlchemy")
        except Exception as e:
            logging.error(f"Error initializing database: {str(e)}")
    
    return app

def init_database(app):
    """Initialize database from app.py for backward compatibility"""
    with app.app_context():
        try:
            init_db_models()
            logging.info("Database initialized successfully with SQLAlchemy")
            return True
        except Exception as e:
            logging.error(f"Error initializing database: {str(e)}")
            return False