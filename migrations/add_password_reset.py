#!/usr/bin/env python3
"""
Migration Script: Add Password Reset Table

This script adds the necessary table to support password reset functionality:
- password_reset_codes table for storing temporary reset codes
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

def check_table_exists(cursor, table):
    """Check if a table exists in the database."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None

def add_password_reset():
    """Add password reset table."""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Add password_reset_codes table if it doesn't exist
        if not check_table_exists(cursor, 'password_reset_codes'):
            logging.info("Creating password_reset_codes table...")
            cursor.execute("""
                CREATE TABLE password_reset_codes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL,
                    code TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0
                )
            """)
            
            # Create index on email for faster lookups
            cursor.execute("""
                CREATE INDEX idx_password_reset_email
                ON password_reset_codes (email)
            """)
            
            # Create index on code for faster verification
            cursor.execute("""
                CREATE INDEX idx_password_reset_code
                ON password_reset_codes (code)
            """)
            
            logging.info("Created password_reset_codes table with indexes.")
        else:
            logging.info("password_reset_codes table already exists.")
        
        # Commit changes
        conn.commit()
        
        # Record migration in activity_logs if the table exists
        if check_table_exists(cursor, 'activity_logs'):
            cursor.execute(
                "INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)",
                ('migration', 'Added password reset table', datetime.now().isoformat())
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
    logging.info("Starting migration to add password reset table...")
    if add_password_reset():
        logging.info("Migration completed successfully.")
        sys.exit(0)
    else:
        logging.error("Migration failed.")
        sys.exit(1)