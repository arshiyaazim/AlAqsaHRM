#!/usr/bin/env python3
"""
Field Attendance Tracker Application - Main Entry Point

This file combines all the components and runs the Flask application.
"""

import os
import sys

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the application factory
from app_init import create_app
from app_auth_routes import bp as auth_bp
from app_error_routes import bp as error_bp, init_app as init_error_app

# Create the application
app = create_app()

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(error_bp)

# Initialize error handling
init_error_app(app)

# Run the application
if __name__ == '__main__':
    # Determine host and port
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    # Check if we should run with SSL
    ssl_context = None
    if os.environ.get('USE_SSL', 'false').lower() == 'true':
        ssl_context = 'adhoc'
    
    # Run the app
    app.run(host=host, port=port, debug=debug, ssl_context=ssl_context)