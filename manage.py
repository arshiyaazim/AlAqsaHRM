#!/usr/bin/env python3
"""
Field Attendance Tracker Management CLI

This script provides CLI tools for database initialization, data import,
system health checks, and other administrative functions.

Usage:
    python manage.py init-db             Initialize the database
    python manage.py health-check        Run system health checks
    python manage.py import-excel FILE   Import data from Excel file
    python manage.py export-data TABLE   Export data from a table

Example:
    python manage.py init-db
    python manage.py import-excel attached_assets/Cleaned_Company_Book_Keeping_April_2025.xlsx
"""

import os
import sys
import sqlite3
import argparse
import json
import logging
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple, Union

# Import data import functions
from import_company_data import import_excel_file

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("manage.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database path
DB_PATH = "instance/attendance.sqlite"
SCHEMA_PATH = "schema.sql"

def get_db_connection() -> sqlite3.Connection:
    """Get a connection to the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Initialize the database with schema."""
    # Check if schema file exists
    if not os.path.exists(SCHEMA_PATH):
        logger.error(f"Schema file not found: {SCHEMA_PATH}")
        sys.exit(1)
    
    # Ensure instance directory exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Connect to database
    conn = get_db_connection()
    
    try:
        # Read and execute schema
        with open(SCHEMA_PATH, 'r') as f:
            schema = f.read()
        
        conn.executescript(schema)
        conn.commit()
        
        logger.info("Database initialized successfully")
        print("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        print(f"Error: {str(e)}")
        sys.exit(1)
    finally:
        conn.close()

def check_system_health() -> Dict[str, Any]:
    """Run system health checks."""
    health = {
        "status": "ok",
        "checks": {},
        "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # Check database connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT sqlite_version()")
        version = cursor.fetchone()[0]
        
        health["checks"]["database"] = {
            "status": "ok",
            "message": f"Connected to SQLite version {version}",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        conn.close()
    except Exception as e:
        health["status"] = "error"
        health["checks"]["database"] = {
            "status": "error",
            "message": f"Database connection failed: {str(e)}",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    # Check required tables
    required_tables = [
        "users", "projects", "attendance", "employees", 
        "cash_receives", "cash_payments", "form_fields", "field_connections"
    ]
    
    try:
        missing_tables = []
        conn = get_db_connection()
        cursor = conn.cursor()
        
        for table in required_tables:
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not cursor.fetchone():
                missing_tables.append(table)
        
        if missing_tables:
            health["status"] = "warning"
            health["checks"]["tables"] = {
                "status": "warning",
                "message": f"Missing required tables: {', '.join(missing_tables)}",
                "missing": missing_tables,
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        else:
            health["checks"]["tables"] = {
                "status": "ok",
                "message": "All required tables exist",
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        
        conn.close()
    except Exception as e:
        health["status"] = "error"
        health["checks"]["tables"] = {
            "status": "error",
            "message": f"Table check failed: {str(e)}",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    # Check uploads directory
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        try:
            os.makedirs(uploads_dir)
            health["checks"]["uploads"] = {
                "status": "warning",
                "message": f"Created missing uploads directory: {uploads_dir}",
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        except Exception as e:
            health["status"] = "error"
            health["checks"]["uploads"] = {
                "status": "error",
                "message": f"Failed to create uploads directory: {str(e)}",
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
    else:
        # Check if uploads directory is writable
        test_file = os.path.join(uploads_dir, ".test")
        try:
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
            health["checks"]["uploads"] = {
                "status": "ok",
                "message": "Uploads directory exists and is writable",
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        except Exception as e:
            health["status"] = "warning"
            health["checks"]["uploads"] = {
                "status": "warning",
                "message": f"Uploads directory exists but is not writable: {str(e)}",
                "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
    
    # Check data statistics
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        stats = {}
        
        # Count records in key tables
        for table in ["users", "projects", "attendance", "employees", "cash_receives", "cash_payments"]:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                stats[table] = count
            except:
                stats[table] = "table not found"
        
        health["checks"]["data"] = {
            "status": "ok",
            "message": "Data statistics collected",
            "stats": stats,
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        conn.close()
    except Exception as e:
        health["checks"]["data"] = {
            "status": "warning",
            "message": f"Failed to collect data statistics: {str(e)}",
            "timestamp": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    # Print health summary
    print("\nSystem Health Check:")
    print(f"Overall Status: {health['status'].upper()}")
    
    for check_name, check in health["checks"].items():
        status_emoji = "✅" if check["status"] == "ok" else "⚠️" if check["status"] == "warning" else "❌"
        print(f"\n{status_emoji} {check_name.capitalize()}:")
        print(f"  Status: {check['status'].upper()}")
        print(f"  Message: {check['message']}")
        
        if check_name == "data" and "stats" in check:
            print("\n  Table Statistics:")
            for table, count in check["stats"].items():
                print(f"    - {table}: {count} records")
    
    return health

def export_data(table_name: str, output_format: str = "csv") -> None:
    """Export data from a table."""
    # Validate table name (basic SQL injection prevention)
    valid_tables = [
        "users", "projects", "attendance", "employees", 
        "cash_receives", "cash_payments", "form_fields", "field_connections"
    ]
    
    if table_name not in valid_tables:
        logger.error(f"Invalid table name: {table_name}")
        print(f"Error: Invalid table name. Valid tables are: {', '.join(valid_tables)}")
        sys.exit(1)
    
    try:
        conn = get_db_connection()
        
        # Get data as pandas DataFrame
        df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
        
        # Generate output filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_filename = f"export_{table_name}_{timestamp}.{output_format}"
        
        # Export based on format
        if output_format == "csv":
            df.to_csv(output_filename, index=False)
        elif output_format == "excel":
            df.to_excel(output_filename, index=False)
        elif output_format == "json":
            df.to_json(output_filename, orient="records", indent=2)
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
        
        conn.close()
        
        logger.info(f"Exported {len(df)} records from {table_name} to {output_filename}")
        print(f"Exported {len(df)} records to {output_filename}")
        
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        print(f"Error: {str(e)}")
        sys.exit(1)

def main():
    """Main function to handle command-line arguments."""
    parser = argparse.ArgumentParser(description='Field Attendance Tracker Management CLI')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # init-db command
    init_parser = subparsers.add_parser('init-db', help='Initialize the database')
    
    # health-check command
    health_parser = subparsers.add_parser('health-check', help='Run system health checks')
    
    # import-excel command
    import_parser = subparsers.add_parser('import-excel', help='Import data from Excel file')
    import_parser.add_argument('file', help='Path to the Excel file')
    
    # export-data command
    export_parser = subparsers.add_parser('export-data', help='Export data from a table')
    export_parser.add_argument('table', help='Table name to export')
    export_parser.add_argument('--format', choices=['csv', 'excel', 'json'], default='csv',
                             help='Output format (default: csv)')
    
    args = parser.parse_args()
    
    # Execute command
    if args.command == 'init-db':
        init_db()
    elif args.command == 'health-check':
        check_system_health()
    elif args.command == 'import-excel':
        if not os.path.exists(args.file):
            logger.error(f"File not found: {args.file}")
            print(f"Error: File not found: {args.file}")
            sys.exit(1)
        
        try:
            results = import_excel_file(args.file)
            
            # Print summary
            print("\nImport Summary:")
            for sheet_name, stats in results.items():
                print(f"\n{sheet_name.upper()}:")
                print(f"  Total records: {stats['total']}")
                print(f"  Successfully imported: {stats['successful']}")
                print(f"  Failed: {stats['failed']}")
                print(f"  Skipped: {stats['skipped']}")
                
                if stats['errors']:
                    print("\nErrors:")
                    for i, error in enumerate(stats['errors'], 1):
                        if i <= 5:  # Show only first 5 errors
                            print(f"  - {error}")
                    
                    if len(stats['errors']) > 5:
                        print(f"  ... and {len(stats['errors']) - 5} more errors. See log file for details.")
            
            print("\nImport completed. Check 'company_import.log' for details.")
            
        except Exception as e:
            logger.error(f"Error importing data: {str(e)}")
            print(f"Error: {str(e)}")
            sys.exit(1)
    elif args.command == 'export-data':
        export_data(args.table, args.format)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()