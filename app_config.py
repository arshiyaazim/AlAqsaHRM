"""
Configuration module for the Flask application.
Loads environment variables from .env file.
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///instance/attendance.db')

# Flask application configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
DEBUG = FLASK_ENV == 'development'

# Session configuration
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
SESSION_COOKIE_HTTPONLY = os.environ.get('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
SESSION_TIMEOUT = int(os.environ.get('SESSION_TIMEOUT', 86400))  # Default: 24 hours in seconds

# CORS configuration
CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')

# User credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
ADMIN_ROLE = os.environ.get('ADMIN_ROLE', 'admin')

HR_USERNAME = os.environ.get('HR_USERNAME', 'hr002')
HR_PASSWORD = os.environ.get('HR_PASSWORD', 'hr1234')
HR_EMAIL = os.environ.get('HR_EMAIL', 'hr@example.com')
HR_ROLE = os.environ.get('HR_ROLE', 'hr')

VIEWER_USERNAME = os.environ.get('VIEWER_USERNAME', 'view003')
VIEWER_PASSWORD = os.environ.get('VIEWER_PASSWORD', 'view789')
VIEWER_EMAIL = os.environ.get('VIEWER_EMAIL', 'viewer@example.com')
VIEWER_ROLE = os.environ.get('VIEWER_ROLE', 'viewer')

# API keys
GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY', '')

# Company settings
COMPANY_NAME = os.environ.get('COMPANY_NAME', 'Al-Aqsa Security')
COMPANY_TAGLINE = os.environ.get('COMPANY_TAGLINE', 'HR & Payroll Management System')
COMPANY_LOGO = os.environ.get('COMPANY_LOGO', 'static/images/logo.png')