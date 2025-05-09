#!/usr/bin/env python
"""
Field Attendance Tracker Application - Main Entry Point

This file combines all the components and runs the Flask application.
"""

import os
import logging
from datetime import datetime
from flask import Flask, g, flash, redirect, url_for, render_template, jsonify, request
from werkzeug.security import check_password_hash
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

# Import our application modules
import app_init
from app_auth_routes import bp as auth_bp
from app_error_routes import bp as error_bp

# Create and configure the app
app = app_init.create_app()

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(error_bp)

# Add error handling
error_bp.init_app(app)

# Start the server
if __name__ == '__main__':
    # Make sure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # Check if running in production
    if os.environ.get('FLASK_ENV') == 'production':
        # Production settings
        app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
    else:
        # Development settings
        app.run(host='0.0.0.0', port=5000, debug=True)