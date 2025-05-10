#!/usr/bin/env python3
"""
Employee Data Importer

A complete Flask application that imports employee data from an Excel file
according to specified requirements.

Features:
- Imports data from Excel files with specific column mapping
- Only processes rows where Employee ID (Column A) is not empty
- Handles partial data (imports records even if some fields are missing)
- Stores data in SQLite database with proper validation
- Provides a simple web interface for uploading files and viewing results
- Includes direct import functionality via command line
"""

from flask import Flask, request, jsonify, render_template, flash, redirect, url_for, send_from_directory
import pandas as pd
import os
import sqlite3
from datetime import datetime
import logging
from werkzeug.utils import secure_filename
import sys
import json
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('employee_import.log')
    ]
)
logger = logging.getLogger(__name__)

# Flask application setup
app = Flask(__name__)
app.secret_key = 'al-aqsa-security-importer-12345'

# Configure upload folder and allowed file extensions
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

# Database configuration
DB_PATH = 'employee_data.db'

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Column mapping from Excel to our fields
COLUMN_MAPPING = {
    'A': 'Employee ID',
    'B': 'Name',
    'C': 'Daily Wage',
    'D': 'Mobile Number',
    'E': 'NID / Passport Number',
    'F': 'Designation',
    'H': 'Join Date'
}

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

def allowed_file(filename):
    """Check if file has an allowed extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
            logger.info(f"Successfully read Excel file with headers")
        except Exception as e:
            try:
                # If that fails, try reading without headers
                logger.warning(f"Error reading with headers: {e}. Trying without headers.")
                df = pd.read_excel(filepath, sheet_name="EmployeeDetails", header=None, engine="openpyxl")
                # Assign column names based on positions (0=A, 1=B, etc.)
                column_mapping = {i: COLUMN_MAPPING.get(chr(65+i), f"Column_{chr(65+i)}") 
                                 for i in range(len(df.columns)) if i < 26}
                df = df.rename(columns=column_mapping)
            except Exception as e2:
                # If both methods fail, try one last attempt with first sheet
                logger.warning(f"Error reading specific sheet: {e2}. Trying first sheet.")
                df = pd.read_excel(filepath, header=None, engine="openpyxl")
                column_mapping = {i: COLUMN_MAPPING.get(chr(65+i), f"Column_{chr(65+i)}") 
                                 for i in range(len(df.columns)) if i < 26}
                df = df.rename(columns=column_mapping)
        
        # Display information about the Excel file
        logger.info(f"Columns found in Excel file: {df.columns.tolist()}")
        logger.info(f"Total rows in Excel file: {len(df)}")
        
        # Display first few rows for diagnostic purposes
        logger.info("Sample data (first 3 rows):")
        for i, row in df.head(3).iterrows():
            logger.info(f"Row {i+1}: {row.to_dict()}")
        
        # Ensure 'Employee ID' column exists
        if "Employee ID" not in df.columns and len(df.columns) > 0:
            # Try to find it with alternative names
            alt_names = ["EmployeeID", "Employee_ID", "ID", "EmpID", df.columns[0]]
            for alt_name in alt_names:
                if alt_name in df.columns:
                    logger.warning(f"'Employee ID' column not found. Using '{alt_name}' instead.")
                    df = df.rename(columns={alt_name: "Employee ID"})
                    break
            else:
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
        imported_employees = []
        
        for index, row in valid_rows.iterrows():
            try:
                # Get Employee ID and validate it's not empty
                employee_id = str(row["Employee ID"]).strip() if pd.notna(row["Employee ID"]) else ""
                
                # Skip if Employee ID is empty after stripping
                if not employee_id:
                    skipped_count += 1
                    continue
                
                # Get values for all other columns, handling missing ones
                employee_data = {
                    "employee_id": employee_id,
                    "name": str(row["Name"]) if "Name" in row and pd.notna(row["Name"]) else "",
                    "daily_wage": None,
                    "mobile_number": "",
                    "nid_passport": "",
                    "designation": "",
                    "join_date": None
                }
                
                # Daily Wage (Column C)
                if "Daily Wage" in row and pd.notna(row["Daily Wage"]):
                    try:
                        employee_data["daily_wage"] = float(row["Daily Wage"])
                    except (ValueError, TypeError):
                        pass
                
                # Mobile Number (Column D)
                if "Mobile Number" in row and pd.notna(row["Mobile Number"]):
                    employee_data["mobile_number"] = str(row["Mobile Number"])
                
                # NID/Passport (Column E)
                if "NID / Passport Number" in row and pd.notna(row["NID / Passport Number"]):
                    employee_data["nid_passport"] = str(row["NID / Passport Number"])
                
                # Designation (Column F)
                if "Designation" in row and pd.notna(row["Designation"]):
                    employee_data["designation"] = str(row["Designation"])
                
                # Join Date (Column H)
                if "Join Date" in row and pd.notna(row["Join Date"]):
                    try:
                        if isinstance(row["Join Date"], datetime):
                            employee_data["join_date"] = row["Join Date"].strftime("%Y-%m-%d")
                        else:
                            employee_data["join_date"] = pd.to_datetime(row["Join Date"]).strftime("%Y-%m-%d")
                    except Exception as e:
                        logger.warning(f"Could not parse date for employee {employee_id}: {e}")
                
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
                imported_employees.append(employee_data)
                
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
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "imported_employees": imported_employees,
            "message": f"Successfully imported {imported_count} employees."
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

def get_all_employees():
    """
    Retrieve all employees from the database.
    
    Returns:
        list: List of dictionaries containing employee data
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This enables dictionary-like access to rows
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT * FROM employees ORDER BY import_date DESC
    ''')
    
    employees = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return employees

def get_import_history():
    """
    Retrieve import history from the database.
    
    Returns:
        list: List of dictionaries containing import history data
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT * FROM import_history ORDER BY import_date DESC
    ''')
    
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return history

# Flask routes
@app.route('/')
def index():
    """Render the main page with the upload form and employee list."""
    employees = get_all_employees()
    history = get_import_history()
    return render_template('index.html', employees=employees, history=history)

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and data import."""
    # Check if a file was uploaded
    if 'file' not in request.files:
        flash('No file part', 'error')
        return redirect(request.url)
    
    file = request.files['file']
    
    # Check if the file is valid
    if file.filename == '':
        flash('No selected file', 'error')
        return redirect(request.url)
    
    if file and allowed_file(file.filename):
        # Save the uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Import data from the Excel file
        result = import_excel_data(filepath)
        
        if result['success']:
            flash(result['message'], 'success')
        else:
            flash(result['message'], 'error')
        
        return redirect('/')
    
    flash('Invalid file type. Please upload an Excel file (.xlsx, .xls)', 'error')
    return redirect(request.url)

@app.route('/api/import', methods=['POST'])
def api_import():
    """API endpoint for importing employee data from an Excel file."""
    # Check if a file was uploaded
    if 'file' not in request.files:
        return jsonify({
            "success": False,
            "message": "No file uploaded"
        }), 400
    
    file = request.files['file']
    
    # Check if the file is valid
    if file.filename == '':
        return jsonify({
            "success": False,
            "message": "Empty filename"
        }), 400
    
    if file and allowed_file(file.filename):
        # Save the uploaded file
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Import data from the Excel file
        result = import_excel_data(filepath)
        
        return jsonify(result)
    
    return jsonify({
        "success": False,
        "message": "Invalid file type. Please upload an Excel file (.xlsx, .xls)"
    }), 400

@app.route('/api/import/path', methods=['POST'])
def api_import_path():
    """API endpoint for importing employee data from a specified file path."""
    try:
        data = request.get_json()
        
        if not data or 'filepath' not in data:
            return jsonify({
                "success": False,
                "message": "No filepath provided"
            }), 400
        
        filepath = data['filepath']
        
        # Check if the file exists
        if not os.path.exists(filepath):
            return jsonify({
                "success": False,
                "message": f"File not found: {filepath}"
            }), 404
        
        # Check if the file has a valid extension
        if not allowed_file(filepath):
            return jsonify({
                "success": False,
                "message": "Invalid file type. Please use an Excel file (.xlsx, .xls)"
            }), 400
        
        # Import data from the Excel file
        result = import_excel_data(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in API import by path: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Error: {str(e)}"
        }), 500

@app.route('/api/employees', methods=['GET'])
def api_employees():
    """API endpoint to retrieve all employees."""
    employees = get_all_employees()
    return jsonify(employees)

@app.route('/api/history', methods=['GET'])
def api_history():
    """API endpoint to retrieve import history."""
    history = get_import_history()
    return jsonify(history)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def run_direct_import(filepath, output_format='text'):
    """
    Run a direct import from the command line.
    
    Args:
        filepath: Path to the Excel file to import
        output_format: Format for output (text, json)
    """
    # Initialize the database
    init_db()
    
    # Import the data
    result = import_excel_data(filepath)
    
    # Display results based on format
    if output_format == 'json':
        print(json.dumps(result, indent=2))
    else:  # text format
        if result['success']:
            print(f"\n✅ {result['message']}")
            print(f"  Imported: {result['imported_count']}")
            print(f"  Skipped: {result['skipped_count']}")
            print(f"  Errors: {len(result['errors'])}")
            
            if result['imported_employees']:
                print("\nSample data (first 5 employees):")
                for i, emp in enumerate(result['imported_employees'][:5]):
                    print(f"{i+1}. {emp['employee_id']} - {emp['name']}")
            
            if result['errors']:
                print("\nErrors:")
                for error in result['errors'][:5]:  # Show only first 5 errors
                    print(f"  - {error}")
                if len(result['errors']) > 5:
                    print(f"  ... and {len(result['errors']) - 5} more errors")
        else:
            print(f"\n❌ Error: {result['message']}")

def main():
    """Main function for command-line usage."""
    parser = argparse.ArgumentParser(description='Import employee data from Excel file')
    parser.add_argument('action', choices=['import', 'serve'], help='Action to perform')
    parser.add_argument('--file', help='Path to Excel file for import')
    parser.add_argument('--output', choices=['text', 'json'], default='text', help='Output format')
    parser.add_argument('--host', default='0.0.0.0', help='Host to serve on')
    parser.add_argument('--port', type=int, default=5000, help='Port to serve on')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    # Initialize the database
    init_db()
    
    if args.action == 'import':
        if not args.file:
            print("Error: --file argument is required for import action")
            return
        
        run_direct_import(args.file, args.output)
    elif args.action == 'serve':
        print(f"Starting web server on {args.host}:{args.port}")
        app.run(host=args.host, port=args.port, debug=args.debug)

if __name__ == '__main__':
    # Check if running as script with arguments
    if len(sys.argv) > 1:
        main()
    else:
        # Default: run the Flask app
        init_db()
        app.run(host='0.0.0.0', port=5000, debug=True)