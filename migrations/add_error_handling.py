#!/usr/bin/env python
"""
Migration Script - Enhance Error Handling System

This script:
1. Enhances the error_logs table with additional fields
2. Creates indexes for improved query performance
3. Adds user_id reference to track who encountered the error
"""

import os
import sys
import sqlite3
import json
import datetime

# Get the database file path
DB_PATH = os.path.join('instance', 'attendance.db')

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def execute_migration():
    """Execute the migration to enhance error handling system"""
    # Check if the database file exists
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        return False
    
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Check if error_logs table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='error_logs'")
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            # Create error_logs table
            cursor.execute('''
                CREATE TABLE error_logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  error_type TEXT NOT NULL,
                  error_message TEXT NOT NULL,
                  error_details TEXT,
                  user_id INTEGER,
                  device_info TEXT,
                  resolved INTEGER NOT NULL DEFAULT 0,
                  resolution_notes TEXT,
                  resolved_at TIMESTAMP,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')
            print("Created error_logs table")
        else:
            # Update existing table schema if needed
            cursor.execute("PRAGMA table_info(error_logs)")
            columns = cursor.fetchall()
            column_names = [col['name'] for col in columns]
            
            # Check which columns need to be added
            new_columns = []
            
            if 'user_id' not in column_names:
                new_columns.append(('user_id', 'INTEGER'))
            
            if 'device_info' not in column_names:
                new_columns.append(('device_info', 'TEXT'))
            
            # Add the new columns
            for column_name, column_type in new_columns:
                query = f"ALTER TABLE error_logs ADD COLUMN {column_name} {column_type}"
                cursor.execute(query)
                print(f"Added column {column_name} to error_logs table")
        
        # 2. Create indexes for improved performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs (error_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs (resolved)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs (user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs (created_at)")
        
        # 3. Log the migration itself
        timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute(
            "INSERT INTO error_logs (error_type, error_message, error_details, resolved) VALUES (?, ?, ?, ?)",
            ('migration', 'Enhanced error handling system', json.dumps({
                'timestamp': timestamp,
                'action': 'Created error_logs table and indexes'
            }), 1)
        )
        
        # Commit the changes
        conn.commit()
        print("Error handling system migration completed successfully")
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