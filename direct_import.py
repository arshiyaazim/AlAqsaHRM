#!/usr/bin/env python3
"""
Direct Employee Data Importer

This script directly imports employee data from an Excel file 
without requiring the Flask web interface.

Usage:
    python direct_import.py path/to/excel_file.xlsx

Example:
    python direct_import.py attached_assets/EmployeeDetails.xlsx
"""

import sys
import os
import sqlite3
import pandas as pd
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('direct_import.log')
    ]
)
logger = logging.getLogger(__name__)

# Database path
DB_PATH = 'employee_data.db'

def init_db():
    """Initialize the SQLite database with required tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create employees table if it doesn't exist
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT UNIQUE NOT NULL,
        name TEXT,
        daily_wage REAL,
        mobile_number TEXT,
        nid_passport TEXT,
        designation TEXT,
        join_date DATE,
        import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Create import_history table to keep track of imports
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS import_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT,
        import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        records_imported INTEGER,
        records_skipped INTEGER,
        has_errors BOOLEAN,
        error_details TEXT
    )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def import_excel_data(filepath):
    """
    Import employee data from Excel file.
    
    Args:
        filepath: Path to the Excel file
        
    Returns:
        dict: A dictionary containing the import results
    """
    try:
        # Check if file exists
        if not os.path.exists(filepath):
            logger.error(f"File not found: {filepath}")
            return {
                "success": False,
                "message": f"File not found: {filepath}",
                "imported_count": 0,
                "skipped_count": 0,
                "errors": [f"File not found: {filepath}"]
            }
        
        # Read the Excel file
        logger.info(f"Reading Excel file: {filepath}")
        
        try:
            # First try to read with default settings
            df = pd.read_excel(filepath, sheet_name="EmployeeDetails", engine="openpyxl")
            logger.info("Successfully read Excel file with 'EmployeeDetails' sheet")
        except Exception as e:
            try:
                # If that fails, try reading without specifying the sheet
                logger.warning(f"Error reading specific sheet: {e}. Trying first sheet.")
                df = pd.read_excel(filepath, engine="openpyxl")
                logger.info("Successfully read Excel file using first sheet")
            except Exception as e2:
                logger.error(f"Failed to read Excel file: {str(e2)}")
                return {
                    "success": False,
                    "message": f"Failed to read Excel file: {str(e2)}",
                    "imported_count": 0,
                    "skipped_count": 0,
                    "errors": [str(e2)]
                }
        
        # Display information about the Excel file
        logger.info(f"Columns found in Excel file: {df.columns.tolist()}")
        logger.info(f"Total rows in Excel file: {len(df)}")
        
        # Display first few rows for diagnostic purposes
        logger.info("Sample data (first 3 rows):")
        for i, row in df.head(3).iterrows():
            logger.info(f"Row {i+1}: {row.to_dict()}")
        
        # Column mapping from Excel to our fields - try various possible column names
        column_mappings = {
            'employee_id': ['Employee ID', 'EmployeeID', 'ID', 'Employee Id', df.columns[0]],
            'name': ['Name', 'Employee Name', 'Full Name'],
            'daily_wage': ['Daily Wage', 'Wage', 'Salary', 'Pay', 'SALARY'],
            'mobile_number': ['Mobile Number', 'Mobile', 'Phone', 'Contact', 'Mobile no.'],
            'nid_passport': ['NID / Passport Number', 'NID', 'Passport', 'ID Number', 'NID No.'],
            'designation': ['Designation', 'Position', 'Job Title', 'Role'],
            'join_date': ['Join Date', 'Joining Date', 'Start Date', 'Date of Join']
        }
        
        # Create a dictionary to store our standardized column names
        field_mapping = {}
        
        # For each of our desired output fields
        for db_field, possible_names in column_mappings.items():
            # Try to find a matching column name in the dataframe
            for name in possible_names:
                if name in df.columns:
                    field_mapping[db_field] = name
                    break
        
        # Print the columns we've identified
        logger.info("Column mapping:")
        for db_field, excel_field in field_mapping.items():
            logger.info(f"  {db_field} <- {excel_field}")
        
        # Ensure we have an Employee ID column
        if 'employee_id' not in field_mapping:
            logger.error("Could not find Employee ID column in Excel file")
            return {
                "success": False,
                "message": "Could not find Employee ID column in Excel file",
                "imported_count": 0,
                "skipped_count": 0,
                "errors": ["Could not find Employee ID column"]
            }
        
        # Filter rows where Employee ID is not empty
        emp_id_col = field_mapping['employee_id']
        valid_df = df[df[emp_id_col].notna()]
        
        logger.info(f"Found {len(valid_df)} rows with non-empty Employee ID")
        
        # Initialize database connection
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Process each valid row
        imported_count = 0
        skipped_count = 0
        errors = []
        
        for index, row in valid_df.iterrows():
            try:
                # Get Employee ID and validate it's not empty
                employee_id = str(row[emp_id_col]).strip() if pd.notna(row[emp_id_col]) else ""
                
                # Skip if Employee ID is empty after stripping
                if not employee_id:
                    skipped_count += 1
                    continue
                
                # Get values for all other fields, handling missing ones
                employee_data = {
                    "employee_id": employee_id,
                    "name": None,
                    "daily_wage": None,
                    "mobile_number": None,
                    "nid_passport": None,
                    "designation": None,
                    "join_date": None
                }
                
                # Process each field
                for db_field, excel_field in field_mapping.items():
                    if db_field == 'employee_id':
                        # Already processed
                        continue
                    
                    if excel_field in row and pd.notna(row[excel_field]):
                        if db_field == 'daily_wage':
                            # Handle numeric field
                            try:
                                employee_data[db_field] = float(row[excel_field])
                            except (ValueError, TypeError):
                                logger.warning(f"Could not convert '{row[excel_field]}' to float for employee {employee_id}")
                        elif db_field == 'join_date':
                            # Handle date field
                            try:
                                if isinstance(row[excel_field], datetime):
                                    employee_data[db_field] = row[excel_field].strftime("%Y-%m-%d")
                                else:
                                    employee_data[db_field] = pd.to_datetime(row[excel_field]).strftime("%Y-%m-%d")
                            except Exception as e:
                                logger.warning(f"Could not parse date '{row[excel_field]}' for employee {employee_id}: {e}")
                        else:
                            # String fields
                            employee_data[db_field] = str(row[excel_field])
                
                # Log the data being processed
                logger.info(f"Processing row {index+1}: ID={employee_data['employee_id']}, Name={employee_data.get('name', 'N/A')}")
                
                # Check if employee already exists and update or insert accordingly
                cursor.execute("SELECT id FROM employees WHERE employee_id = ?", (employee_data["employee_id"],))
                existing_employee = cursor.fetchone()
                
                if existing_employee:
                    # Update existing employee
                    cursor.execute('''
                    UPDATE employees 
                    SET name = ?, daily_wage = ?, mobile_number = ?, 
                        nid_passport = ?, designation = ?, join_date = ?,
                        import_date = CURRENT_TIMESTAMP
                    WHERE employee_id = ?
                    ''', (
                        employee_data["name"], 
                        employee_data["daily_wage"], 
                        employee_data["mobile_number"], 
                        employee_data["nid_passport"], 
                        employee_data["designation"], 
                        employee_data["join_date"], 
                        employee_data["employee_id"]
                    ))
                    logger.info(f"Updated existing employee: {employee_data['employee_id']}")
                else:
                    # Insert new employee
                    cursor.execute('''
                    INSERT INTO employees 
                    (employee_id, name, daily_wage, mobile_number, nid_passport, designation, join_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        employee_data["employee_id"], 
                        employee_data["name"], 
                        employee_data["daily_wage"], 
                        employee_data["mobile_number"], 
                        employee_data["nid_passport"], 
                        employee_data["designation"], 
                        employee_data["join_date"]
                    ))
                    logger.info(f"Inserted new employee: {employee_data['employee_id']}")
                
                imported_count += 1
                
            except Exception as e:
                logger.error(f"Error processing row {index+1}: {str(e)}")
                errors.append(f"Row {index+1}: {str(e)}")
                skipped_count += 1
        
        # Record the import in the history table
        file_name = os.path.basename(filepath)
        cursor.execute('''
        INSERT INTO import_history 
        (file_name, records_imported, records_skipped, has_errors, error_details)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            file_name,
            imported_count,
            skipped_count,
            len(errors) > 0,
            json.dumps(errors) if errors else None
        ))
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        # Print summary
        logger.info(f"Import completed: {imported_count} imported, {skipped_count} skipped, {len(errors)} errors")
        
        return {
            "success": True,
            "message": f"Successfully imported {imported_count} employees",
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Error importing Excel file: {str(e)}")
        return {
            "success": False,
            "message": f"Error importing Excel file: {str(e)}",
            "imported_count": 0,
            "skipped_count": 0,
            "errors": [str(e)]
        }

def display_all_employees():
    """Display all employees in the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT * FROM employees ORDER BY import_date DESC
    ''')
    
    employees = cursor.fetchall()
    conn.close()
    
    if not employees:
        print("No employees found in the database.")
        return
    
    print(f"\nTotal employees in database: {len(employees)}")
    print("\n--- EMPLOYEE LIST ---")
    for i, emp in enumerate(employees):
        print(f"{i+1:3d}. {emp['employee_id']:15} | {emp['name'] or 'N/A':25} | Wage: {emp['daily_wage'] or 'N/A'}")
    
    print("\n--- IMPORT HISTORY ---")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT * FROM import_history ORDER BY import_date DESC
    ''')
    
    history = cursor.fetchall()
    conn.close()
    
    for entry in history:
        status = "✓ Success" if not entry['has_errors'] else f"⚠ Completed with {entry['error_details'].count(':') if entry['error_details'] else 0} errors"
        print(f"{entry['import_date']} | {entry['file_name']} | {entry['records_imported']} imported, {entry['records_skipped']} skipped | {status}")

def main():
    # Check command-line arguments
    if len(sys.argv) < 2:
        print("Usage: python direct_import.py path/to/excel_file.xlsx")
        return
    
    filepath = sys.argv[1]
    
    # Initialize the database
    init_db()
    
    # Import the data
    print(f"\n--- IMPORTING EMPLOYEES FROM {filepath} ---\n")
    result = import_excel_data(filepath)
    
    # Print result
    if result['success']:
        print(f"\n✅ {result['message']}")
        print(f"  Imported: {result['imported_count']}")
        print(f"  Skipped: {result['skipped_count']}")
        print(f"  Errors: {len(result['errors'])}")
        
        if result['errors']:
            print("\nErrors:")
            for i, error in enumerate(result['errors'][:5]):  # Show only first 5 errors
                print(f"  {i+1}. {error}")
            if len(result['errors']) > 5:
                print(f"  ... and {len(result['errors']) - 5} more errors")
    else:
        print(f"\n❌ Error: {result['message']}")
    
    # Display all employees in the database
    display_all_employees()

if __name__ == "__main__":
    main()