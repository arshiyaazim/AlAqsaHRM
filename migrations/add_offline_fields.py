#!/usr/bin/env python3
"""
Migration Script: Add Offline Fields

This script adds the necessary fields to the attendance table
to support offline functionality:
- offline_record: Flag indicating if record was created offline
- device_info: JSON string with device information
- synced_at: Timestamp when record was synced to server
"""

import sqlite3
import os
import sys
import logging
from datetime import datetime

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

def check_column_exists(cursor, table, column):
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [col[1] for col in cursor.fetchall()]
    return column in columns

def add_offline_fields():
    """Add offline-related fields to the attendance table."""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if attendance table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attendance'")
        if not cursor.fetchone():
            logging.error("Attendance table does not exist. Run init-db first.")
            return False
        
        # Add offline_record column if it doesn't exist
        if not check_column_exists(cursor, 'attendance', 'offline_record'):
            logging.info("Adding offline_record column to attendance table...")
            cursor.execute("ALTER TABLE attendance ADD COLUMN offline_record INTEGER NOT NULL DEFAULT 0")
            logging.info("Added offline_record column.")
        else:
            logging.info("offline_record column already exists.")
        
        # Add device_info column if it doesn't exist
        if not check_column_exists(cursor, 'attendance', 'device_info'):
            logging.info("Adding device_info column to attendance table...")
            cursor.execute("ALTER TABLE attendance ADD COLUMN device_info TEXT")
            logging.info("Added device_info column.")
        else:
            logging.info("device_info column already exists.")
        
        # Add synced_at column if it doesn't exist
        if not check_column_exists(cursor, 'attendance', 'synced_at'):
            logging.info("Adding synced_at column to attendance table...")
            cursor.execute("ALTER TABLE attendance ADD COLUMN synced_at TIMESTAMP")
            logging.info("Added synced_at column.")
        else:
            logging.info("synced_at column already exists.")
        
        # Commit changes
        conn.commit()
        logging.info("Migration completed successfully.")
        
        # Record migration in activity_logs if the table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
        if cursor.fetchone():
            cursor.execute(
                "INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)",
                ('migration', 'Added offline fields to attendance table', datetime.now().isoformat())
            )
            conn.commit()
        
        return True
    
    except Exception as e:
        logging.error(f"Error during migration: {str(e)}")
        return False
    
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    logging.info("Starting migration to add offline fields...")
    if add_offline_fields():
        logging.info("Migration completed successfully.")
        sys.exit(0)
    else:
        logging.error("Migration failed.")
        sys.exit(1)