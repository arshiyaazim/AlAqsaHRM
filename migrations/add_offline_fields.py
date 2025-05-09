#!/usr/bin/env python
"""
Migration Script - Add Offline Fields to Attendance Table

This script adds new fields to the attendance table to support offline synchronization:
- synced_at: Timestamp when an offline record was synced to the server
- offline_record: Flag indicating if the record was collected offline
- device_info: JSON data with device information
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
    """Execute the migration to add offline fields"""
    # Check if the database file exists
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        return False
    
    try:
        # Connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current table schema
        cursor.execute("PRAGMA table_info(attendance)")
        columns = cursor.fetchall()
        column_names = [col['name'] for col in columns]
        
        # Check which columns need to be added
        new_columns = []
        if 'synced_at' not in column_names:
            new_columns.append(('synced_at', 'TIMESTAMP'))
        
        if 'offline_record' not in column_names:
            new_columns.append(('offline_record', 'INTEGER NOT NULL DEFAULT 0'))
        
        if 'device_info' not in column_names:
            new_columns.append(('device_info', 'TEXT'))
        
        # Add the new columns
        for column_name, column_type in new_columns:
            query = f"ALTER TABLE attendance ADD COLUMN {column_name} {column_type}"
            cursor.execute(query)
            print(f"Added column {column_name} to attendance table")
        
        # If no columns were added, report it
        if not new_columns:
            print("All required columns already exist. No changes made.")
        else:
            # Check if error_logs table exists before trying to log
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='error_logs'")
            if cursor.fetchone():
                # Log the migration in the database
                timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                cursor.execute(
                    "INSERT INTO error_logs (error_type, error_message, error_details, resolved) VALUES (?, ?, ?, ?)",
                    ('migration', 'Added offline fields to attendance table', json.dumps({
                        'added_columns': [col[0] for col in new_columns], 
                        'timestamp': timestamp
                    }), 1)
                )
            else:
                print("Error logs table not found, skipping migration logging.")
        
        # Commit the changes
        conn.commit()
        print("Migration completed successfully")
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