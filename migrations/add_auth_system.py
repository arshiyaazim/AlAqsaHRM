#!/usr/bin/env python
"""
Migration Script - Enhance Authentication System

This script:
1. Adds email and role validation to the users table
2. Updates existing users to have proper roles
3. Creates new indexes for improved performance
"""

import os
import sys
import sqlite3
import json
import datetime
from werkzeug.security import generate_password_hash

# Get the database file path
DB_PATH = os.path.join('instance', 'attendance.db')

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def execute_migration():
    """Execute the migration to enhance authentication system"""
    # Check if the database file exists
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        return False
    
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Make sure the users table has all required fields
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        column_names = [col['name'] for col in columns]
        
        # Check which columns need to be added
        new_columns = []
        if 'email' not in column_names:
            new_columns.append(('email', 'TEXT'))
        
        if 'role' not in column_names:
            new_columns.append(('role', 'TEXT NOT NULL DEFAULT "viewer"'))
        
        if 'active' not in column_names:
            new_columns.append(('active', 'INTEGER NOT NULL DEFAULT 1'))
        
        if 'created_at' not in column_names:
            new_columns.append(('created_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP'))
        
        if 'last_login' not in column_names:
            new_columns.append(('last_login', 'TIMESTAMP'))
        
        # Add the new columns
        for column_name, column_type in new_columns:
            query = f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"
            cursor.execute(query)
            print(f"Added column {column_name} to users table")
        
        # 2. Check if there's an admin user, create if not
        cursor.execute("SELECT * FROM users WHERE role = 'admin'")
        admin = cursor.fetchone()
        
        if not admin:
            admin_password = generate_password_hash('admin123')
            cursor.execute(
                "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
                ('admin', admin_password, 'admin@alaqsa.com', 'admin')
            )
            print("Created default admin user")
        
        # 3. Create indexes for improved performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)")
        
        # 4. Log the migration
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='error_logs'")
        if cursor.fetchone():
            timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                "INSERT INTO error_logs (error_type, error_message, error_details, resolved) VALUES (?, ?, ?, ?)",
                ('migration', 'Enhanced authentication system', json.dumps({
                    'added_columns': [col[0] for col in new_columns], 
                    'timestamp': timestamp
                }), 1)
            )
        else:
            print("Error logs table not found, skipping migration logging.")
        
        # Commit the changes
        conn.commit()
        print("Authentication system migration completed successfully")
        return True
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        return False
    except Exception as e:
        print(f"Error executing migration: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == '__main__':
    success = execute_migration()
    sys.exit(0 if success else 1)