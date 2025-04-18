#!/usr/bin/env python3
"""
Employee Data Importer

This script imports employee data from an Excel file using Flask and pandas.
It reads specific columns and handles empty cells according to requirements.
"""

from flask import Flask, request, jsonify, render_template, flash, redirect, url_for
import pandas as pd
import os
import sqlite3
from datetime import datetime
import logging
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'al-aqsa-security-importer-12345'

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
        # Read the Excel file
        logger.info(f"Reading Excel file: {filepath}")
        df = pd.read_excel(filepath, sheet_name="EmployeeDetails", engine="openpyxl")
        
        # Log the columns found in the Excel file
        logger.info(f"Columns found in Excel file: {df.columns.tolist()}")
        logger.info(f"Total rows in Excel file: {len(df)}")
        
        # Map Excel columns to our desired field names
        # Note: This handles both numeric indices and named columns
        column_mapping = {
            0: "Employee ID",  # Column A
            1: "Name",         # Column B
            2: "Daily Wage",   # Column C
            3: "Mobile Number", # Column D
            4: "NID / Passport Number", # Column E
            5: "Designation",  # Column F
            7: "Join Date"     # Column H
        }
        
        # Try to rename columns if they exist, otherwise use position-based access
        try:
            # First attempt with column names if headers exist
            df = df.rename(columns={
                "Employee ID": "Employee ID",
                "Name": "Name", 
                "Daily Wage": "Daily Wage",
                "Mobile Number": "Mobile Number",
                "NID / Passport Number": "NID / Passport Number",
                "Designation": "Designation",
                "Join Date": "Join Date"
            })
        except:
            # Fall back to position-based column access if header renaming fails
            df = pd.read_excel(filepath, sheet_name="EmployeeDetails", header=None, engine="openpyxl")
            df = df.rename(columns=column_mapping)
        
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
        
        for index, row in valid_rows.iterrows():
            try:
                employee_id = str(row["Employee ID"]).strip()
                
                # Skip completely if Employee ID is empty after stripping
                if not employee_id:
                    skipped_count += 1
                    continue
                
                # Get other fields, handling empty values
                name = str(row["Name"]) if pd.notna(row["Name"]) else ""
                
                # Convert daily wage to float if possible, otherwise use None
                try:
                    daily_wage = float(row["Daily Wage"]) if pd.notna(row["Daily Wage"]) else None
                except:
                    daily_wage = None
                
                mobile_number = str(row["Mobile Number"]) if pd.notna(row["Mobile Number"]) else ""
                nid_passport = str(row["NID / Passport Number"]) if pd.notna(row["NID / Passport Number"]) else ""
                designation = str(row["Designation"]) if pd.notna(row["Designation"]) else ""
                
                # Handle join date
                join_date = None
                if pd.notna(row["Join Date"]):
                    try:
                        # Try to parse as date if it's a date object or string
                        if isinstance(row["Join Date"], datetime):
                            join_date = row["Join Date"].strftime("%Y-%m-%d")
                        else:
                            # Try to parse as string date in various formats
                            join_date = pd.to_datetime(row["Join Date"]).strftime("%Y-%m-%d")
                    except:
                        # Leave as None if parsing fails
                        join_date = None
                
                # Print diagnostic info for each row being processed
                logger.info(f"Processing row {index+1}: ID={employee_id}, Name={name}, Wage={daily_wage}")
                
                # Check if employee already exists and update or insert accordingly
                cursor.execute("SELECT id FROM employees WHERE employee_id = ?", (employee_id,))
                existing_employee = cursor.fetchone()
                
                if existing_employee:
                    # Update existing employee
                    cursor.execute('''
                    UPDATE employees 
                    SET name = ?, daily_wage = ?, mobile_number = ?, 
                        nid_passport = ?, designation = ?, join_date = ?,
                        import_date = CURRENT_TIMESTAMP
                    WHERE employee_id = ?
                    ''', (name, daily_wage, mobile_number, nid_passport, 
                          designation, join_date, employee_id))
                    logger.info(f"Updated existing employee: {employee_id}")
                else:
                    # Insert new employee
                    cursor.execute('''
                    INSERT INTO employees 
                    (employee_id, name, daily_wage, mobile_number, nid_passport, designation, join_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (employee_id, name, daily_wage, mobile_number, 
                          nid_passport, designation, join_date))
                    logger.info(f"Inserted new employee: {employee_id}")
                
                imported_count += 1
                
            except Exception as e:
                logger.error(f"Error processing row {index+1}: {str(e)}")
                errors.append(f"Row {index+1}: {str(e)}")
                skipped_count += 1
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        logger.info(f"Import completed: {imported_count} imported, {skipped_count} skipped, {len(errors)} errors")
        
        return {
            "success": True,
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "errors": errors,
            "message": f"Successfully imported {imported_count} employees."
        }
        
    except Exception as e:
        logger.error(f"Error importing Excel file: {str(e)}")
        return {
            "success": False,
            "message": f"Error importing Excel file: {str(e)}",
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

@app.route('/')
def index():
    """Render the main page with the upload form and employee list."""
    employees = get_all_employees()
    return render_template('index.html', employees=employees)

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
        
        return redirect(url_for('index'))
    
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

@app.route('/api/employees', methods=['GET'])
def api_employees():
    """API endpoint to retrieve all employees."""
    employees = get_all_employees()
    return jsonify(employees)

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

if __name__ == '__main__':
    # Initialize the database
    init_db()
    
    # Run the Flask application
    app.run(host='0.0.0.0', port=5001, debug=True)