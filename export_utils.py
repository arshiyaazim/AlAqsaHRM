"""
Data Export Utilities for Al-Aqsa HRM

This module provides functionality for exporting data from the application in various formats:
- CSV export for attendance records, employee data, and other tables
- JSON export for full or partial database backups
- SQL dump for complete database backup

Usage:
    For CLI usage:
        python export_utils.py all path/to/export/folder
        python export_utils.py attendance path/to/export/file.csv
        python export_utils.py employees path/to/export/file.csv
        
    For programmatic usage:
        from export_utils import export_to_csv, export_to_json, export_database
"""
import os
import sys
import csv
import json
import sqlite3
import logging
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('export.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('export_utils')

# Database configuration
DATABASE = 'employee_data.db'
EXPORT_FOLDER = 'exports'

# Create export folder if it doesn't exist
os.makedirs(EXPORT_FOLDER, exist_ok=True)

def get_db_connection() -> sqlite3.Connection:
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def get_timestamp() -> str:
    """Get a timestamp string for filenames."""
    return datetime.now().strftime('%Y%m%d_%H%M%S')

def export_to_csv(table_name: str, output_path: Optional[str] = None) -> str:
    """
    Export a table to CSV format.
    
    Args:
        table_name: Name of the table to export
        output_path: Path to the output file (optional)
        
    Returns:
        Path to the exported file
    """
    logger.info(f"Exporting table '{table_name}' to CSV")
    
    # Generate default output path if not provided
    if not output_path:
        timestamp = get_timestamp()
        output_path = os.path.join(EXPORT_FOLDER, f"{table_name}_{timestamp}.csv")
    
    try:
        # Get data from database
        with get_db_connection() as conn:
            # Check if table exists
            cursor = conn.cursor()
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                error_msg = f"Table '{table_name}' does not exist"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Get all records from the table
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            if not rows:
                logger.warning(f"No data found in table '{table_name}'")
                # Create empty CSV with headers
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [column[1] for column in cursor.fetchall()]
                with open(output_path, 'w', newline='') as csv_file:
                    csv_writer = csv.writer(csv_file)
                    csv_writer.writerow(columns)
                return output_path
            
            # Create DataFrame from results
            df = pd.DataFrame([dict(row) for row in rows])
            
            # Export to CSV
            df.to_csv(output_path, index=False)
            
            logger.info(f"Exported {len(df)} records to {output_path}")
            return output_path
    
    except Exception as e:
        error_msg = f"Error exporting table '{table_name}' to CSV: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def export_to_json(table_name: str, output_path: Optional[str] = None) -> str:
    """
    Export a table to JSON format.
    
    Args:
        table_name: Name of the table to export
        output_path: Path to the output file (optional)
        
    Returns:
        Path to the exported file
    """
    logger.info(f"Exporting table '{table_name}' to JSON")
    
    # Generate default output path if not provided
    if not output_path:
        timestamp = get_timestamp()
        output_path = os.path.join(EXPORT_FOLDER, f"{table_name}_{timestamp}.json")
    
    try:
        # Get data from database
        with get_db_connection() as conn:
            # Check if table exists
            cursor = conn.cursor()
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                error_msg = f"Table '{table_name}' does not exist"
                logger.error(error_msg)
                raise ValueError(error_msg)
            
            # Get all records from the table
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            # Convert to list of dictionaries
            data = [dict(row) for row in rows]
            
            # Write to JSON file
            with open(output_path, 'w') as json_file:
                json.dump(data, json_file, indent=2)
            
            logger.info(f"Exported {len(data)} records to {output_path}")
            return output_path
    
    except Exception as e:
        error_msg = f"Error exporting table '{table_name}' to JSON: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def export_database(output_path: Optional[str] = None) -> str:
    """
    Export the entire database as SQL statements.
    
    Args:
        output_path: Path to the output file (optional)
        
    Returns:
        Path to the exported file
    """
    logger.info("Exporting full database to SQL")
    
    # Generate default output path if not provided
    if not output_path:
        timestamp = get_timestamp()
        output_path = os.path.join(EXPORT_FOLDER, f"database_backup_{timestamp}.sql")
    
    try:
        # Connect to the database
        source_conn = sqlite3.connect(DATABASE)
        source_conn.text_factory = str
        
        # Open the output file
        with open(output_path, 'w') as f:
            # Get a list of all tables
            cursor = source_conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [table[0] for table in cursor.fetchall()]
            
            # Export each table
            for table in tables:
                # Skip SQLite internal tables
                if table == 'sqlite_sequence':
                    continue
                
                # Write table creation SQL
                cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
                create_statement = cursor.fetchone()[0]
                f.write(f"{create_statement};\n\n")
                
                # Get data from table
                cursor.execute(f"SELECT * FROM {table}")
                rows = cursor.fetchall()
                
                if rows:
                    # Get column names
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [column[1] for column in cursor.fetchall()]
                    
                    # Write INSERT statements
                    for row in rows:
                        values = []
                        for value in row:
                            if value is None:
                                values.append("NULL")
                            elif isinstance(value, (int, float)):
                                values.append(str(value))
                            else:
                                # Escape single quotes in string values
                                values.append(f"'{str(value).replace('\'', '\'\'')}'")
                        
                        f.write(f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(values)});\n")
                    
                    f.write("\n")
            
            # Add a final commit statement
            f.write("COMMIT;\n")
        
        source_conn.close()
        logger.info(f"Database exported to {output_path}")
        return output_path
    
    except Exception as e:
        error_msg = f"Error exporting database to SQL: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def export_full_backup(output_dir: Optional[str] = None) -> Dict[str, str]:
    """
    Export all tables to CSV, JSON, and a full database backup.
    
    Args:
        output_dir: Directory to store the exported files (optional)
        
    Returns:
        Dictionary mapping table names to export file paths
    """
    logger.info("Performing full backup export")
    
    # Generate default output directory if not provided
    if not output_dir:
        timestamp = get_timestamp()
        output_dir = os.path.join(EXPORT_FOLDER, f"full_backup_{timestamp}")
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        export_results = {}
        
        # Get all table names
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [table[0] for table in cursor.fetchall() if table[0] != 'sqlite_sequence']
        
        # Export each table to CSV and JSON
        for table in tables:
            csv_path = os.path.join(output_dir, f"{table}.csv")
            json_path = os.path.join(output_dir, f"{table}.json")
            
            export_results[f"{table}_csv"] = export_to_csv(table, csv_path)
            export_results[f"{table}_json"] = export_to_json(table, json_path)
        
        # Export full database
        sql_path = os.path.join(output_dir, "database_backup.sql")
        export_results["database_sql"] = export_database(sql_path)
        
        logger.info(f"Full backup completed to {output_dir}")
        return export_results
    
    except Exception as e:
        error_msg = f"Error performing full backup: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def create_export_zip(export_files: List[str], output_path: Optional[str] = None) -> str:
    """
    Create a ZIP archive containing exported files.
    
    Args:
        export_files: List of files to include in the ZIP
        output_path: Path to the output ZIP file (optional)
        
    Returns:
        Path to the ZIP file
    """
    import zipfile
    
    # Generate default output path if not provided
    if not output_path:
        timestamp = get_timestamp()
        output_path = os.path.join(EXPORT_FOLDER, f"export_{timestamp}.zip")
    
    try:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in export_files:
                if os.path.exists(file_path):
                    # Add file to ZIP with just the filename, not the full path
                    zipf.write(file_path, os.path.basename(file_path))
        
        logger.info(f"Created ZIP archive at {output_path}")
        return output_path
    
    except Exception as e:
        error_msg = f"Error creating ZIP archive: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

def main():
    """Command-line interface for exporting data."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python export_utils.py [table_name|all] [output_path]")
        print("  python export_utils.py attendance path/to/output.csv")
        print("  python export_utils.py employees path/to/output.csv")
        print("  python export_utils.py all path/to/output/folder")
        print("  python export_utils.py database path/to/output.sql")
        sys.exit(1)
    
    export_type = sys.argv[1].lower()
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        if export_type == 'all':
            results = export_full_backup(output_path)
            print(f"Full backup completed successfully.")
            for key, path in results.items():
                print(f"  - {key}: {path}")
            
        elif export_type == 'database':
            path = export_database(output_path)
            print(f"Database exported to: {path}")
            
        else:
            # Assume export_type is a table name
            path = export_to_csv(export_type, output_path)
            print(f"Table '{export_type}' exported to: {path}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()