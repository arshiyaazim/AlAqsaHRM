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
import pandas as pd
import sqlite3
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Database setup
DB_PATH = 'employees.db'

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
                "message": f"File not found: {filepath}"
            }
            
        # Read the Excel file
        logger.info(f"Reading Excel file: {filepath}")
        
        try:
            # First try to read with default settings
            df = pd.read_excel(filepath, sheet_name="EmployeeDetails", engine="openpyxl")
            logger.info(f"Successfully read Excel file with headers")
        except Exception as e:
            logger.warning(f"Error reading with headers: {e}. Trying without headers.")
            # If that fails, try reading without headers
            df = pd.read_excel(filepath, sheet_name="EmployeeDetails", header=None, engine="openpyxl")
            # Assign column names based on positions
            df.columns = [f"Column_{i}" for i in range(len(df.columns))]
            # Map specific positions to our expected column names
            column_mapping = {
                "Column_0": "Employee ID",  # Column A
                "Column_1": "Name",         # Column B
                "Column_2": "Daily Wage",   # Column C
                "Column_3": "Mobile Number", # Column D
                "Column_4": "NID / Passport Number", # Column E
                "Column_5": "Designation",  # Column F
                "Column_7": "Join Date"     # Column H (if there's a Column G)
            }
            # Only rename columns that exist in the dataframe
            valid_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
            df = df.rename(columns=valid_columns)
        
        # Display information about the Excel file
        logger.info(f"Columns found in Excel file: {df.columns.tolist()}")
        logger.info(f"Total rows in Excel file: {len(df)}")
        
        # Display first few rows for diagnostic purposes
        logger.info("Sample data (first 3 rows):")
        for i, row in df.head(3).iterrows():
            logger.info(f"Row {i+1}: {row.to_dict()}")
        
        # Ensure 'Employee ID' column exists, otherwise use first column
        if "Employee ID" not in df.columns and len(df.columns) > 0:
            logger.warning("'Employee ID' column not found. Using first column instead.")
            first_col = df.columns[0]
            df = df.rename(columns={first_col: "Employee ID"})
        
        # Filter rows where Employee ID (column A) is not empty
        valid_rows = df[df["Employee ID"].notna()]
        
        logger.info(f"Valid rows with non-empty Employee ID: {len(valid_rows)}")
        
        # Initialize database connection
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Process each valid row
        imported_count = 0
        skipped_count = 0
        errors = []
        import_results = []
        
        for index, row in valid_rows.iterrows():
            try:
                # Get Employee ID and validate it's not empty
                employee_id = str(row["Employee ID"]).strip() if pd.notna(row["Employee ID"]) else ""
                
                # Skip if Employee ID is empty after stripping
                if not employee_id:
                    skipped_count += 1
                    continue
                
                # Get values for all other columns, handling missing ones
                employee_data = {}
                employee_data["employee_id"] = employee_id
                
                # Name (Column B)
                name_column = "Name" if "Name" in row.index else None
                employee_data["name"] = str(row[name_column]) if name_column and pd.notna(row[name_column]) else ""
                
                # Daily Wage (Column C)
                wage_column = "Daily Wage" if "Daily Wage" in row.index else None
                try:
                    employee_data["daily_wage"] = float(row[wage_column]) if wage_column and pd.notna(row[wage_column]) else None
                except (ValueError, TypeError):
                    employee_data["daily_wage"] = None
                
                # Mobile Number (Column D)
                mobile_column = "Mobile Number" if "Mobile Number" in row.index else None
                employee_data["mobile_number"] = str(row[mobile_column]) if mobile_column and pd.notna(row[mobile_column]) else ""
                
                # NID/Passport (Column E)
                nid_column = "NID / Passport Number" if "NID / Passport Number" in row.index else None
                employee_data["nid_passport"] = str(row[nid_column]) if nid_column and pd.notna(row[nid_column]) else ""
                
                # Designation (Column F)
                designation_column = "Designation" if "Designation" in row.index else None
                employee_data["designation"] = str(row[designation_column]) if designation_column and pd.notna(row[designation_column]) else ""
                
                # Join Date (Column H)
                join_date_column = "Join Date" if "Join Date" in row.index else None
                if join_date_column and pd.notna(row[join_date_column]):
                    try:
                        if isinstance(row[join_date_column], datetime):
                            employee_data["join_date"] = row[join_date_column].strftime("%Y-%m-%d")
                        else:
                            employee_data["join_date"] = pd.to_datetime(row[join_date_column]).strftime("%Y-%m-%d")
                    except:
                        employee_data["join_date"] = None
                else:
                    employee_data["join_date"] = None
                
                # Log the data being processed
                logger.info(f"Processing row {index+1}: ID={employee_data['employee_id']}, Name={employee_data['name']}")
                
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
                import_results.append(employee_data)
                
            except Exception as e:
                logger.error(f"Error processing row {index+1}: {str(e)}")
                errors.append(f"Row {index+1}: {str(e)}")
                skipped_count += 1
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        # Print summary
        logger.info(f"Import completed: {imported_count} imported, {skipped_count} skipped, {len(errors)} errors")
        
        return {
            "success": True,
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "import_results": import_results,
            "message": f"Successfully imported {imported_count} employees."
        }
        
    except Exception as e:
        logger.error(f"Error importing Excel file: {str(e)}")
        return {
            "success": False,
            "message": f"Error importing Excel file: {str(e)}",
            "errors": [str(e)]
        }

def display_all_employees():
    """Display all employees in the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM employees ORDER BY import_date DESC')
    employees = cursor.fetchall()
    
    if not employees:
        print("No employees found in the database.")
    else:
        print(f"\nTotal employees: {len(employees)}")
        print("\n{:<15} {:<25} {:<10} {:<15} {:<20} {:<15} {:<12}".format(
            "Employee ID", "Name", "Daily Wage", "Mobile", "NID/Passport", "Designation", "Join Date"
        ))
        print("-" * 120)
        
        for emp in employees:
            print("{:<15} {:<25} {:<10} {:<15} {:<20} {:<15} {:<12}".format(
                emp['employee_id'], 
                emp['name'][:23] + (emp['name'][23:] and '...'), 
                str(emp['daily_wage'] or 'N/A'), 
                emp['mobile_number'] or 'N/A',
                emp['nid_passport'] or 'N/A',
                emp['designation'] or 'N/A',
                emp['join_date'] or 'N/A'
            ))
    
    conn.close()

def main():
    # Initialize the database
    init_db()
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python direct_import.py path/to/excel_file.xlsx")
        return
    
    # Get the Excel file path from command line
    excel_file = sys.argv[1]
    
    # Import the data
    result = import_excel_data(excel_file)
    
    # Print the result
    if result['success']:
        print(f"\n✅ {result['message']}")
        
        # Display some stats
        print(f"  - Imported: {result['imported_count']}")
        print(f"  - Skipped: {result['skipped_count']}")
        print(f"  - Errors: {len(result['errors'])}")
        
        # Display all employees
        display_all_employees()
    else:
        print(f"\n❌ Error: {result['message']}")
        
        if 'errors' in result and result['errors']:
            print("\nDetailed errors:")
            for error in result['errors']:
                print(f"  - {error}")

if __name__ == "__main__":
    main()