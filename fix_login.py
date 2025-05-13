#!/usr/bin/env python
"""
Fix Login Database Script for Al-Aqsa HRM

This script directly creates/fixes the users and admins tables
and inserts the default admin user if needed. 

Run this script with: python fix_login.py
"""

import os
import sys
import sqlite3
import logging
from werkzeug.security import generate_password_hash

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Default admin credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Possible database locations
DB_PATHS = [
    'instance/attendance.db',
    'attendance.db',
    'employee_data.db',
]

def find_database():
    """Find the database file"""
    for path in DB_PATHS:
        if os.path.exists(path):
            logging.info(f"Found database at: {path}")
            return path
    
    # If no database found, use the first path and create directories if needed
    db_path = DB_PATHS[0]
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    logging.info(f"No existing database found. Will create at: {db_path}")
    return db_path

def ensure_tables_exist(conn):
    """Ensure that essential tables exist"""
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    users_exists = cursor.fetchone()
    
    if not users_exists:
        logging.info("Creating users table")
        cursor.execute('''
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE,
          name TEXT,
          role TEXT NOT NULL DEFAULT 'viewer',
          active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP,
          last_login TIMESTAMP
        )
        ''')
        conn.commit()
        logging.info("Users table created successfully")
    else:
        logging.info("Users table already exists")
    
    # Check if admins table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'")
    admins_exists = cursor.fetchone()
    
    if not admins_exists:
        logging.info("Creating admins table")
        cursor.execute('''
        CREATE TABLE admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE,
          name TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP,
          last_login TIMESTAMP
        )
        ''')
        conn.commit()
        logging.info("Admins table created successfully")
    else:
        logging.info("Admins table already exists")
    
    # Check if activity_logs table exists - needed for login
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
    activity_logs_exists = cursor.fetchone()
    
    if not activity_logs_exists:
        logging.info("Creating activity_logs table")
        cursor.execute('''
        CREATE TABLE activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          user_agent TEXT,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        conn.commit()
        logging.info("Activity_logs table created successfully")
    else:
        logging.info("Activity_logs table already exists")
    
    # Check if attendance table exists - essential for admin dashboard
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'")
    attendance_exists = cursor.fetchone()
    
    if not attendance_exists:
        logging.info("Creating attendance table")
        cursor.execute('''
        CREATE TABLE attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT NOT NULL,
          action TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          project_id INTEGER,
          latitude REAL,
          longitude REAL,
          accuracy REAL,
          photo TEXT,
          notes TEXT,
          custom_fields TEXT,
          created_by INTEGER,
          ip_address TEXT,
          device_info TEXT
        )
        ''')
        conn.commit()
        logging.info("Attendance table created successfully")
    else:
        logging.info("Attendance table already exists")
    
    # Check if projects table exists - essential for admin dashboard
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
    projects_exists = cursor.fetchone()
    
    if not projects_exists:
        logging.info("Creating projects table")
        cursor.execute('''
        CREATE TABLE projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          location TEXT,
          start_date TEXT,
          end_date TEXT,
          active INTEGER NOT NULL DEFAULT 1,
          custom_fields TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP
        )
        ''')
        conn.commit()
        logging.info("Projects table created successfully")
    else:
        logging.info("Projects table already exists")
    
    # Check if menu_items table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='menu_items'")
    menu_items_exists = cursor.fetchone()
    
    if not menu_items_exists:
        logging.info("Creating menu_items table")
        cursor.execute('''
        CREATE TABLE menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          icon TEXT,
          parent_id INTEGER,
          visible_to TEXT DEFAULT 'all',
          display_order INTEGER DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        conn.commit()
        logging.info("Menu_items table created successfully")
    else:
        logging.info("Menu_items table already exists")
    
    # Check if form_fields table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='form_fields'")
    form_fields_exists = cursor.fetchone()
    
    if not form_fields_exists:
        logging.info("Creating form_fields table")
        cursor.execute('''
        CREATE TABLE form_fields (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          form_id TEXT NOT NULL,
          field_name TEXT NOT NULL,
          field_label TEXT NOT NULL,
          field_type TEXT NOT NULL,
          field_options TEXT,
          required INTEGER NOT NULL DEFAULT 0,
          display_order INTEGER DEFAULT 0,
          visible_to TEXT DEFAULT 'all',
          parent_field_id INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          enable_suggestions INTEGER DEFAULT 0
        )
        ''')
        conn.commit()
        logging.info("Form_fields table created successfully")
    else:
        logging.info("Form_fields table already exists")
    
    # Check if custom_styles table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_styles'")
    custom_styles_exists = cursor.fetchone()
    
    if not custom_styles_exists:
        logging.info("Creating custom_styles table")
        cursor.execute('''
        CREATE TABLE custom_styles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          element_selector TEXT NOT NULL,
          css_properties TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP,
          priority INTEGER DEFAULT 0
        )
        ''')
        conn.commit()
        logging.info("Custom_styles table created successfully")
    else:
        logging.info("Custom_styles table already exists")
    
    # Check if employees table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'")
    employees_exists = cursor.fetchone()
    
    if not employees_exists:
        logging.info("Creating employees table")
        cursor.execute('''
        CREATE TABLE employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT,
          position TEXT,
          department TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          hire_date TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP,
          active INTEGER NOT NULL DEFAULT 1
        )
        ''')
        conn.commit()
        logging.info("Employees table created successfully")
    else:
        logging.info("Employees table already exists")
    
    return True

def ensure_admin_exists(conn):
    """Ensure that admin user exists in both tables"""
    cursor = conn.cursor()
    
    # Check for admin in users table
    cursor.execute(
        'SELECT id FROM users WHERE username = ? AND role = ?', 
        (ADMIN_USERNAME, 'admin')
    )
    admin_in_users = cursor.fetchone()
    
    if not admin_in_users:
        logging.info(f"Creating admin user in users table")
        try:
            hashed_password = generate_password_hash(ADMIN_PASSWORD)
            cursor.execute(
                'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
                (ADMIN_USERNAME, hashed_password, 'Administrator', 'admin')
            )
            conn.commit()
            logging.info("Admin user created in users table")
        except sqlite3.IntegrityError as e:
            conn.rollback()
            logging.warning(f"Failed to create admin in users table (may already exist): {e}")
        except Exception as e:
            conn.rollback()
            logging.error(f"Error creating admin in users table: {e}")
    else:
        logging.info("Admin user already exists in users table")
    
    # Check for admin in admins table
    cursor.execute(
        'SELECT id FROM admins WHERE username = ?', 
        (ADMIN_USERNAME,)
    )
    admin_in_admins = cursor.fetchone()
    
    if not admin_in_admins:
        logging.info(f"Creating admin user in admins table")
        try:
            hashed_password = generate_password_hash(ADMIN_PASSWORD)
            cursor.execute(
                'INSERT INTO admins (username, password, name) VALUES (?, ?, ?)',
                (ADMIN_USERNAME, hashed_password, 'Administrator')
            )
            conn.commit()
            logging.info("Admin user created in admins table")
        except sqlite3.IntegrityError as e:
            conn.rollback()
            logging.warning(f"Failed to create admin in admins table (may already exist): {e}")
        except Exception as e:
            conn.rollback()
            logging.error(f"Error creating admin in admins table: {e}")
    else:
        logging.info("Admin user already exists in admins table")
    
    return True

def reset_admin_password(conn):
    """Reset admin password in both tables"""
    cursor = conn.cursor()
    hashed_password = generate_password_hash(ADMIN_PASSWORD)
    
    # Update in users table
    try:
        cursor.execute(
            'UPDATE users SET password = ? WHERE username = ? AND role = ?',
            (hashed_password, ADMIN_USERNAME, 'admin')
        )
        users_updated = cursor.rowcount
        
        # Update in admins table
        cursor.execute(
            'UPDATE admins SET password = ? WHERE username = ?',
            (hashed_password, ADMIN_USERNAME)
        )
        admins_updated = cursor.rowcount
        
        conn.commit()
        
        if users_updated > 0:
            logging.info(f"Reset admin password in users table")
        if admins_updated > 0:
            logging.info(f"Reset admin password in admins table")
        if users_updated == 0 and admins_updated == 0:
            logging.warning("No admin user found to reset password")
            
    except Exception as e:
        conn.rollback()
        logging.error(f"Error resetting admin password: {e}")
    
    return True

def verify_login(conn):
    """Verify that login would work with current tables"""
    cursor = conn.cursor()
    results = []
    
    # Check users table
    try:
        cursor.execute(
            'SELECT id, username, password FROM users WHERE username = ? AND role = ?',
            (ADMIN_USERNAME, 'admin')
        )
        admin_in_users = cursor.fetchone()
        if admin_in_users:
            results.append(f"Admin user exists in users table with ID: {admin_in_users[0]}")
        else:
            results.append("Admin user NOT FOUND in users table")
    except Exception as e:
        results.append(f"Error checking users table: {e}")
    
    # Check admins table
    try:
        cursor.execute(
            'SELECT id, username, password FROM admins WHERE username = ?',
            (ADMIN_USERNAME,)
        )
        admin_in_admins = cursor.fetchone()
        if admin_in_admins:
            results.append(f"Admin user exists in admins table with ID: {admin_in_admins[0]}")
        else:
            results.append("Admin user NOT FOUND in admins table")
    except Exception as e:
        results.append(f"Error checking admins table: {e}")
    
    return results

def main():
    """Main function to fix login tables"""
    logging.info("Starting login fix script")
    logging.info(f"Using admin username: {ADMIN_USERNAME}")
    
    db_path = find_database()
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Create tables if missing
        ensure_tables_exist(conn)
        
        # Create admin user if missing
        ensure_admin_exists(conn)
        
        # Reset admin password to be sure
        reset_admin_password(conn)
        
        # Verify login would work
        verification = verify_login(conn)
        for result in verification:
            logging.info(result)
        
        conn.close()
        
        logging.info(f"Login fix completed successfully. Admin login should now work with:")
        logging.info(f"Username: {ADMIN_USERNAME}")
        logging.info(f"Password: {ADMIN_PASSWORD}")
        
        return True
    except Exception as e:
        logging.error(f"Error fixing login: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        sys.exit(0)
    else:
        sys.exit(1)