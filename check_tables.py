#!/usr/bin/env python3
"""
Database Table Verification Script for AlAqsaHRM

This script checks all required tables in the database and verifies
their structure. This is useful for diagnosing deployment issues.

Usage:
    python check_tables.py

"""

import os
import sys
import sqlite3
import logging
import traceback
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Database location
DATABASE = 'instance/employee_data.db'
RENDER_DATABASE = '/var/data/db/employee_data.db'

def check_tables():
    """Check all required tables and their structure."""
    try:
        # Determine database path
        db_path = RENDER_DATABASE if os.path.exists(RENDER_DATABASE) else DATABASE
        
        if not os.path.exists(db_path):
            logging.error(f"Database file not found at {db_path}")
            print(f"❌ Database file not found at {db_path}")
            return False
            
        # Connect to database
        logging.info(f"Connecting to database at {db_path}")
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Get list of tables
        cursor = conn.cursor()
        tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
        
        if not tables:
            logging.error("No tables found in database")
            print("❌ No tables found in database")
            return False
        
        print(f"\n===== DATABASE TABLES ({len(tables)}) =====")
        for table in tables:
            table_name = table['name']
            row_count = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
            print(f"✓ {table_name} ({row_count} rows)")
            
            # Get table structure
            columns = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()
            print(f"  Columns ({len(columns)}):")
            for col in columns:
                print(f"    - {col['name']} ({col['type']})")
            print()
        
        # Check for critical tables
        critical_tables = ['users', 'attendance', 'projects', 'employees']
        missing = [t for t in critical_tables if t not in [table['name'] for table in tables]]
        
        if missing:
            logging.warning(f"Missing critical tables: {', '.join(missing)}")
            print(f"⚠️ Missing critical tables: {', '.join(missing)}")
        else:
            logging.info("All critical tables present")
            print("✓ All critical tables present")
            
        # Check admin user
        try:
            admin = cursor.execute("SELECT username FROM users WHERE role = 'admin' LIMIT 1").fetchone()
            if admin:
                logging.info(f"Admin user found: {admin['username']}")
                print(f"✓ Admin user found: {admin['username']}")
            else:
                logging.warning("No admin user found in users table")
                print("⚠️ No admin user found in users table")
        except sqlite3.Error as e:
            logging.warning(f"Could not check admin user: {str(e)}")
            print(f"⚠️ Could not check admin user: {str(e)}")
            
        # Close connection
        conn.close()
        return True
        
    except Exception as e:
        logging.error(f"Error checking database tables: {str(e)}")
        logging.error(traceback.format_exc())
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    print(f"AlAqsaHRM Database Check ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
    print("=" * 50)
    success = check_tables()
    sys.exit(0 if success else 1)