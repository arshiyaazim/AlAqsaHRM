#!/usr/bin/env python3
"""
Field Attendance Tracker Application - Main Entry Point

This file combines all the components and runs the Flask application.
"""
import os
from app_init import app

if __name__ == "__main__":
    # Get the port from environment variable or use default (8000)
    port = int(os.environ.get("PORT", 8000))
    
    # Run the Flask app - ensure it's accessible from other machines
    app.run(host="0.0.0.0", port=port, debug=app.config['DEBUG'])
    
    print(f"Starting Field Attendance Tracker on port {port}")