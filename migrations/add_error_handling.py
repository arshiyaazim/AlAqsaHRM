#!/usr/bin/env python3
"""
Migration Script: Add Error Handling System

This script adds the necessary tables and fields to support
a comprehensive error tracking and handling system:
- error_logs table for tracking and managing errors
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

def add_error_handling():
    """Add error handling system tables and fields."""
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Add error_logs table if it doesn't exist
        if not check_table_exists(cursor, 'error_logs'):
            logging.info("Creating error_logs table...")
            cursor.execute("""
                CREATE TABLE error_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    error_type TEXT NOT NULL,
                    error_message TEXT NOT NULL,
                    error_details TEXT,
                    device_info TEXT,
                    resolved INTEGER NOT NULL DEFAULT 0,
                    resolution_notes TEXT,
                    resolved_by INTEGER,
                    resolved_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (resolved_by) REFERENCES users (id)
                )
            """)
            logging.info("Created error_logs table.")
        else:
            # Check if we need to add any columns that might be missing
            cursor.execute("PRAGMA table_info(error_logs)")
            columns = [col[1] for col in cursor.fetchall()]
            
            # Add device_info column if it doesn't exist
            if 'device_info' not in columns:
                logging.info("Adding device_info column to error_logs table...")
                cursor.execute("ALTER TABLE error_logs ADD COLUMN device_info TEXT")
                logging.info("Added device_info column.")
            
            # Add resolution_notes column if it doesn't exist
            if 'resolution_notes' not in columns:
                logging.info("Adding resolution_notes column to error_logs table...")
                cursor.execute("ALTER TABLE error_logs ADD COLUMN resolution_notes TEXT")
                logging.info("Added resolution_notes column.")
            
            # Add resolved_by column if it doesn't exist
            if 'resolved_by' not in columns:
                logging.info("Adding resolved_by column to error_logs table...")
                cursor.execute("ALTER TABLE error_logs ADD COLUMN resolved_by INTEGER REFERENCES users(id)")
                logging.info("Added resolved_by column.")
            
            # Add resolved_at column if it doesn't exist
            if 'resolved_at' not in columns:
                logging.info("Adding resolved_at column to error_logs table...")
                cursor.execute("ALTER TABLE error_logs ADD COLUMN resolved_at TIMESTAMP")
                logging.info("Added resolved_at column.")
            
            logging.info("Updated error_logs table with any missing columns.")
        
        # Add index on error_type for faster filtering
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_error_logs_error_type
            ON error_logs (error_type)
        """)
        
        # Add index on created_at for faster date filtering
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_error_logs_created_at
            ON error_logs (created_at)
        """)
        
        # Add index on resolved for faster filtering
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_error_logs_resolved
            ON error_logs (resolved)
        """)
        
        # Commit changes
        conn.commit()
        
        # Record migration in activity_logs if the table exists
        if check_table_exists(cursor, 'activity_logs'):
            cursor.execute(
                "INSERT INTO activity_logs (action, details, created_at) VALUES (?, ?, ?)",
                ('migration', 'Added error handling system tables and fields', datetime.now().isoformat())
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
    logging.info("Starting migration to add error handling system...")
    if add_error_handling():
        logging.info("Migration completed successfully.")
        sys.exit(0)
    else:
        logging.error("Migration failed.")
        sys.exit(1)