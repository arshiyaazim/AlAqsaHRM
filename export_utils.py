#!/usr/bin/env python
"""
Export Utilities for Field Attendance Tracker

This script provides export functionality for the Field Attendance Tracker application,
allowing users to export various data in different formats.
"""

import os
import sys
import csv
import json
import sqlite3
import zipfile
import shutil
import logging
from datetime import datetime
import pandas as pd

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("export.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DB_PATH = "employee_data.db"
EXPORTS_DIR = "exports"
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")

def get_db_connection():
    """Create a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_exports_dir():
    """Ensure the exports directory exists."""
    if not os.path.exists(EXPORTS_DIR):
        os.makedirs(EXPORTS_DIR)

def export_to_csv(table_name, output_path):
    """Export a table to CSV format."""
    try:
        conn = get_db_connection()
        
        # Get all data from the table
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        # Fetch all rows
        rows = cursor.fetchall()
        
        # Write to CSV
        with open(output_path, 'w', newline='', encoding='utf-8') as csv_file:
            csv_writer = csv.writer(csv_file)
            
            # Write header
            csv_writer.writerow(column_names)
            
            # Write data rows
            for row in rows:
                csv_writer.writerow(row)
        
        conn.close()
        logger.info(f"Successfully exported {table_name} to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error exporting {table_name} to CSV: {str(e)}")
        if conn:
            conn.close()
        return False

def export_to_json(table_name, output_path):
    """Export a table to JSON format."""
    try:
        conn = get_db_connection()
        
        # Get all data from the table
        cursor = conn.cursor()
        cursor.execute(f"SELECT * FROM {table_name}")
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        # Fetch all rows
        rows = cursor.fetchall()
        
        # Convert to list of dictionaries
        data = []
        for row in rows:
            data.append(dict(zip(column_names, row)))
        
        # Write to JSON
        with open(output_path, 'w', encoding='utf-8') as json_file:
            json.dump(data, json_file, ensure_ascii=False, indent=4)
        
        conn.close()
        logger.info(f"Successfully exported {table_name} to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error exporting {table_name} to JSON: {str(e)}")
        if conn:
            conn.close()
        return False

def export_database(output_path):
    """Export the entire database as SQL."""
    try:
        # Use sqlite3 to dump the database
        if os.name == 'nt':  # Windows
            os.system(f'sqlite3 {DB_PATH} .dump > {output_path}')
        else:  # Unix/Linux/Mac
            os.system(f'sqlite3 {DB_PATH} .dump > {output_path}')
        
        logger.info(f"Successfully exported database to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error exporting database: {str(e)}")
        return False

def export_all(output_path):
    """Export the complete database and files as a ZIP."""
    try:
        temp_dir = f"temp_export_{TIMESTAMP}"
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        # Copy database
        shutil.copy2(DB_PATH, os.path.join(temp_dir, os.path.basename(DB_PATH)))
        
        # Export database as SQL
        export_database(os.path.join(temp_dir, "database_dump.sql"))
        
        # Export main tables as CSV and JSON
        tables = ["users", "employees", "attendance", "projects", "payroll"]
        for table in tables:
            try:
                export_to_csv(table, os.path.join(temp_dir, f"{table}.csv"))
                export_to_json(table, os.path.join(temp_dir, f"{table}.json"))
            except Exception as e:
                logger.warning(f"Error exporting {table}: {str(e)}")
        
        # Create ZIP file
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, temp_dir)
                    zipf.write(file_path, arcname)
        
        # Clean up
        shutil.rmtree(temp_dir)
        
        logger.info(f"Successfully exported all data to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Error exporting all data: {str(e)}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        return False

def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 3:
        print("Usage: python export_utils.py <export_type> <output_path>")
        sys.exit(1)
    
    export_type = sys.argv[1]
    output_path = sys.argv[2]
    
    logger.info(f"Starting export: {export_type} to {output_path}")
    
    if export_type == "employees_csv":
        export_to_csv("employees", output_path)
    elif export_type == "employees_json":
        export_to_json("employees", output_path)
    elif export_type == "attendance_csv":
        export_to_csv("attendance", output_path)
    elif export_type == "attendance_json":
        export_to_json("attendance", output_path)
    elif export_type == "payroll_csv":
        export_to_csv("payroll", output_path)
    elif export_type == "expenditures_csv":
        export_to_csv("expenditures", output_path)
    elif export_type == "incomes_csv":
        export_to_csv("incomes", output_path)
    elif export_type == "database":
        export_database(output_path)
    elif export_type == "all":
        export_all(output_path)
    else:
        logger.error(f"Unknown export type: {export_type}")
        print(f"Unknown export type: {export_type}")
        sys.exit(1)
    
    logger.info(f"Export completed: {export_type}")
    print(f"Export completed: {export_type}")

if __name__ == "__main__":
    main()