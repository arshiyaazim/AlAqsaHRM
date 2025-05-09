#!/usr/bin/env python3
"""
Migration Script: Add Authentication System

This script adds the necessary tables and fields to support
a robust authentication system with role-based access control:
- users table with role-based permissions
- activity_logs table for auditing
"""

import sqlite3
import os
import sys
import logging
from datetime import datetime
from werkzeug.security import generate_password_hash

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migrations.log'),
        logging.StreamHandler()
    ]
)

# Get database path from environment or use default
DB_PATH = os.environ.get('DATABASE_PATH', 'instance/attendance.db')

def check_table_exists(cursor, table):
    """Check if a table exists in the database."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None

def add_auth_system():
    """Add authentication system tables and fields."""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Add users table if it doesn't exist
        if not check_table_exists(cursor, 'users'):
            logging.info("Creating users table...")
            cursor.execute("""
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
            """)
            
            # Create default admin user
            default_admin_password = generate_password_hash('admin123')
            cursor.execute(
                "INSERT INTO users (username, password, email, name, role) VALUES (?, ?, ?, ?, ?)",
                ('admin', default_admin_password, 'admin@example.com', 'Administrator', 'admin')
            )
            
            logging.info("Created users table with default admin user.")
        else:
            logging.info("Users table already exists.")
        
        # Add activity_logs table if it doesn't exist
        if not check_table_exists(cursor, 'activity_logs'):
            logging.info("Creating activity_logs table...")
            cursor.execute("""
                CREATE TABLE activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            logging.info("Created activity_logs table.")
        else:
            logging.info("Activity_logs table already exists.")
        
        # Update attendance table to add created_by field if it doesn't have it
        if check_table_exists(cursor, 'attendance'):
            cursor.execute("PRAGMA table_info(attendance)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'created_by' not in columns:
                logging.info("Adding created_by field to attendance table...")
                cursor.execute("ALTER TABLE attendance ADD COLUMN created_by INTEGER REFERENCES users(id)")
                logging.info("Added created_by field to attendance table.")
            else:
                logging.info("created_by field already exists in attendance table.")
        
        # Update projects table to add created_by field if it doesn't have it
        if check_table_exists(cursor, 'projects'):
            cursor.execute("PRAGMA table_info(projects)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'created_by' not in columns:
                logging.info("Adding created_by field to projects table...")
                cursor.execute("ALTER TABLE projects ADD COLUMN created_by INTEGER REFERENCES users(id)")
                logging.info("Added created_by field to projects table.")
            else:
                logging.info("created_by field already exists in projects table.")
        
        # Commit changes
        conn.commit()
        
        # Record migration itself in activity_logs
        cursor.execute(
            "INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)",
            ('migration', 'Added authentication system tables and fields', datetime.now().isoformat())
        )
        conn.commit()
        
        logging.info("Migration completed successfully.")
        return True
    
    except Exception as e:
        logging.error(f"Error during migration: {str(e)}")
        return False
    
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    logging.info("Starting migration to add authentication system...")
    if add_auth_system():
        logging.info("Migration completed successfully.")
        sys.exit(0)
    else:
        logging.error("Migration failed.")
        sys.exit(1)