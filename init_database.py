#!/usr/bin/env python3
"""
Database Initialization Script for Field Attendance Tracker

This script initializes the SQLite database with all required tables
and creates the admin user if it doesn't exist. This is useful for
fresh installations or when deploying to production environments.

Usage:
    python init_database.py

"""

import os
import sys
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/database_init.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

def main():
    """Main function to initialize the database."""
    try:
        # Check for Render.com persistent disk
        render_disk = '/var/data'
        using_render_disk = os.path.exists(render_disk) and os.access(render_disk, os.W_OK)
        
        if using_render_disk:
            logging.info(f"Detected Render.com persistent disk at {render_disk}")
            # Create subdirectories on the persistent disk
            render_dirs = ['db', 'logs', 'uploads', 'exports']
            for directory in render_dirs:
                full_path = os.path.join(render_disk, directory)
                logging.info(f'Creating directory on persistent disk: {full_path}')
                os.makedirs(full_path, exist_ok=True)
            
            # Create symlinks if they don't exist
            symlinks = {
                'instance': os.path.join(render_disk, 'db'),
                'logs': os.path.join(render_disk, 'logs'),
                'uploads': os.path.join(render_disk, 'uploads'),
                'exports': os.path.join(render_disk, 'exports')
            }
            
            for link_name, target in symlinks.items():
                if not os.path.exists(link_name):
                    logging.info(f'Creating symlink: {link_name} -> {target}')
                    try:
                        os.symlink(target, link_name)
                    except OSError as e:
                        logging.warning(f"Could not create symlink {link_name}: {str(e)}")
        
        # Create required directories (works for both local and Render environments)
        dirs = ['instance', 'logs', 'exports', 'uploads']
        for directory in dirs:
            logging.info(f'Creating directory: {directory}')
            os.makedirs(directory, exist_ok=True)
        
        # Import app and init_db function
        logging.info("Importing app module...")
        from app import app, init_db
        
        # Initialize database
        logging.info("Beginning database initialization...")
        with app.app_context():
            success = init_db()
            if success:
                logging.info("Database initialized successfully")
                print("✅ Database initialized successfully")
            else:
                logging.warning("Database initialization may not have completed successfully")
                print("⚠️ Database initialization may not have completed successfully")
        
        # Test database connection
        logging.info("Testing database connection...")
        from app import get_db
        with app.app_context():
            db = get_db()
            result = db.execute("SELECT 1").fetchone()
            if result:
                logging.info("Database connection test passed")
                print("✅ Database connection test passed")
            else:
                logging.error("Database connection test failed")
                print("❌ Database connection test failed")
                
        # Verify admin user
        logging.info("Verifying admin user...")
        with app.app_context():
            db = get_db()
            admin = db.execute("SELECT username FROM admins LIMIT 1").fetchone()
            if admin:
                logging.info(f"Admin user found: {admin['username']}")
                print(f"✅ Admin user found: {admin['username']}")
            else:
                logging.warning("No admin user found, database may be empty")
                print("⚠️ No admin user found, database may be empty")
        
        return 0
    except Exception as e:
        logging.error(f"Error during database initialization: {str(e)}")
        logging.error(traceback.format_exc())
        print(f"❌ Error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())