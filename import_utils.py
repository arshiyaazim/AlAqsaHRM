"""
Data Import Utilities for Al-Aqsa HRM

This module consolidates functionality from multiple data import scripts into a single
comprehensive utility that can handle various import operations such as:
- Employee data import from Excel files
- Company financial data import (cash receives, payments)
- Direct imports via CLI or UI

Usage:
    For CLI usage:
        python import_utils.py employees path/to/excel.xlsx
        python import_utils.py company path/to/excel.xlsx
        
    For programmatic usage:
        from import_utils import import_employee_data, import_company_data
        results = import_employee_data('path/to/excel.xlsx')
"""
import os
import sys
import json
import sqlite3
import logging
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('import_utils')

# Database configuration
DATABASE = 'employee_data.db'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'xlsx', 'xls'}

def get_db_connection() -> sqlite3.Connection:
    """Get a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """Initialize the SQLite database with required tables."""
    with get_db_connection() as conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id TEXT UNIQUE NOT NULL,
            first_name TEXT,
            last_name TEXT,
            position TEXT,
            department TEXT,
            join_date TEXT,
            salary REAL,
            contact_number TEXT,
            email TEXT,
            status TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS cash_receives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            voucher_number TEXT,
            received_from TEXT,
            amount REAL,
            description TEXT,
            receiver TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS cash_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            voucher_number TEXT,
            paid_to TEXT,
            amount REAL,
            description TEXT,
            payer TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS import_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT,
            file_path TEXT,
            import_type TEXT,
            records_processed INTEGER,
            records_imported INTEGER,
            records_skipped INTEGER,
            errors TEXT,
            import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        ''')
    logger.info("Database initialized successfully.")

def allowed_file(filename: str) -> bool:
    """Check if file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def format_scientific_notation(value: Any) -> str:
    """
    Convert scientific notation numbers to strings preserving all digits.
    
    Args:
        value: The value to convert
        
    Returns:
        A string representation of the value
    """
    if pd.isna(value):
        return ''
    
    if isinstance(value, float):
        # Convert scientific notation to full string representation
        return f"{value:.15f}".rstrip('0').rstrip('.') if '.' in f"{value:.15f}" else f"{value:.0f}"
    
    return str(value) if value is not None else ''

def import_employee_data(filepath: str) -> Dict[str, Any]:
    """
    Import employee data from Excel file.
    
    Args:
        filepath: Path to the Excel file
        
    Returns:
        dict: A dictionary containing the import results
    """
    logger.info(f"Starting employee data import from {filepath}")
    results = {
        "processed": 0,
        "imported": 0,
        "skipped": 0,
        "errors": []
    }
    
    try:
        # Read Excel file
        df = pd.read_excel(filepath)
        results["processed"] = len(df)
        
        # Ensure required column is present
        if 'employee_id' not in df.columns and 'Employee ID' not in df.columns:
            col_name = df.columns[0] if len(df.columns) > 0 else "Unknown"
            error_msg = f"Employee ID column not found. First column is '{col_name}'"
            results["errors"].append(error_msg)
            logger.error(error_msg)
            return results
        
        # Map column names to database fields
        column_mapping = {
            'Employee ID': 'employee_id',
            'employee_id': 'employee_id',
            'First Name': 'first_name',
            'first_name': 'first_name',
            'Last Name': 'last_name',
            'last_name': 'last_name',
            'Position': 'position',
            'position': 'position',
            'Department': 'department',
            'department': 'department',
            'Join Date': 'join_date',
            'join_date': 'join_date',
            'Salary': 'salary',
            'salary': 'salary',
            'Contact Number': 'contact_number',
            'contact_number': 'contact_number',
            'Email': 'email',
            'email': 'email',
            'Status': 'status',
            'status': 'status'
        }
        
        # Standard database field names
        db_fields = [
            'employee_id', 'first_name', 'last_name', 'position', 
            'department', 'join_date', 'salary', 'contact_number', 
            'email', 'status'
        ]
        
        with get_db_connection() as conn:
            for _, row in df.iterrows():
                try:
                    # Skip rows where Employee ID is empty
                    employee_id_col = 'Employee ID' if 'Employee ID' in df.columns else 'employee_id'
                    employee_id_val = row[employee_id_col]
                    if pd.isna(employee_id_val) or str(employee_id_val).strip() == '':
                        results["skipped"] += 1
                        continue
                    
                    # Map values to database fields
                    values = {}
                    for col in df.columns:
                        if col in column_mapping:
                            db_field = column_mapping[col]
                            if db_field in db_fields:
                                cell_value = row[col]
                                # Handle salary specially to prevent scientific notation
                                if db_field == 'salary' and not pd.isna(cell_value):
                                    values[db_field] = float(format_scientific_notation(cell_value))
                                else:
                                    values[db_field] = str(cell_value) if not pd.isna(cell_value) else None
                    
                    # Ensure employee_id is present
                    if 'employee_id' not in values or not values['employee_id']:
                        results["skipped"] += 1
                        continue
                    
                    # Format employee_id to avoid scientific notation issues
                    values['employee_id'] = format_scientific_notation(values['employee_id'])
                    
                    # Check if employee already exists
                    existing = conn.execute(
                        'SELECT id FROM employees WHERE employee_id = ?', 
                        (values['employee_id'],)
                    ).fetchone()
                    
                    if existing:
                        # Update existing record
                        fields = [f"{field} = ?" for field in values.keys() if field != 'employee_id']
                        query = f"UPDATE employees SET {', '.join(fields)} WHERE employee_id = ?"
                        params = [values[field] for field in values.keys() if field != 'employee_id']
                        params.append(values['employee_id'])
                        conn.execute(query, params)
                    else:
                        # Insert new record
                        fields = ', '.join(values.keys())
                        placeholders = ', '.join(['?' for _ in values.keys()])
                        query = f"INSERT INTO employees ({fields}) VALUES ({placeholders})"
                        conn.execute(query, list(values.values()))
                    
                    results["imported"] += 1
                except Exception as e:
                    error = f"Error importing row: {e}"
                    results["errors"].append(error)
                    logger.error(error)
                    results["skipped"] += 1
            
            # Save import history
            conn.execute(
                '''INSERT INTO import_history 
                   (file_name, file_path, import_type, records_processed, records_imported, records_skipped, errors)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (os.path.basename(filepath), filepath, 'employees', 
                 results["processed"], results["imported"], results["skipped"], 
                 json.dumps(results["errors"]))
            )
            conn.commit()
        
        logger.info(f"Employee import completed: {results['imported']} imported, {results['skipped']} skipped")
        return results
        
    except Exception as e:
        error = f"Error processing file: {str(e)}"
        results["errors"].append(error)
        logger.error(error)
        return results

def import_company_data(filepath: str) -> Dict[str, Dict[str, Any]]:
    """
    Import company data from Excel file.
    
    Args:
        filepath: Path to the Excel file
        
    Returns:
        Dict with import statistics for each sheet
    """
    logger.info(f"Starting company data import from {filepath}")
    results = {
        "employees": {"processed": 0, "imported": 0, "skipped": 0, "errors": []},
        "cash_receives": {"processed": 0, "imported": 0, "skipped": 0, "errors": []},
        "cash_payments": {"processed": 0, "imported": 0, "skipped": 0, "errors": []}
    }
    
    try:
        # Different sheets to import
        sheets = {
            "EmployeeDetails": "employees",
            "CashReceive": "cash_receives",
            "CashPayments": "cash_payments"
        }
        
        # Read Excel file with multiple sheets
        excel_file = pd.ExcelFile(filepath)
        
        with get_db_connection() as conn:
            # Process each sheet
            for sheet_name, table_name in sheets.items():
                if sheet_name in excel_file.sheet_names:
                    logger.info(f"Processing sheet: {sheet_name}")
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    results[table_name]["processed"] = len(df)
                    
                    if table_name == "employees":
                        # Import employees
                        for _, row in df.iterrows():
                            try:
                                # Skip if Employee ID is empty
                                employee_id_col = next((col for col in df.columns if col.lower() in ['employee id', 'employeeid']), None)
                                if not employee_id_col or pd.isna(row[employee_id_col]) or str(row[employee_id_col]).strip() == '':
                                    results[table_name]["skipped"] += 1
                                    continue
                                
                                employee_id = format_scientific_notation(row[employee_id_col])
                                
                                # Map columns based on available data
                                columns = {
                                    'first_name': next((col for col in df.columns if col.lower() in ['first name', 'firstname']), None),
                                    'last_name': next((col for col in df.columns if col.lower() in ['last name', 'lastname']), None),
                                    'position': next((col for col in df.columns if col.lower() in ['position', 'job title']), None),
                                    'department': next((col for col in df.columns if col.lower() in ['department', 'dept']), None),
                                    'join_date': next((col for col in df.columns if col.lower() in ['join date', 'joining date']), None),
                                    'salary': next((col for col in df.columns if col.lower() in ['salary', 'basic salary']), None),
                                    'contact_number': next((col for col in df.columns if col.lower() in ['contact number', 'phone']), None),
                                    'email': next((col for col in df.columns if col.lower() in ['email', 'email address']), None),
                                    'status': next((col for col in df.columns if col.lower() in ['status', 'employee status']), None)
                                }
                                
                                values = {'employee_id': employee_id}
                                for field, col in columns.items():
                                    if col and pd.notna(row[col]):
                                        if field == 'salary':
                                            values[field] = float(format_scientific_notation(row[col]))
                                        else:
                                            values[field] = str(row[col])
                                
                                # Check if employee exists
                                existing = conn.execute(
                                    'SELECT id FROM employees WHERE employee_id = ?', 
                                    (employee_id,)
                                ).fetchone()
                                
                                if existing:
                                    # Update existing employee
                                    fields = [f"{field} = ?" for field in values.keys() if field != 'employee_id']
                                    query = f"UPDATE employees SET {', '.join(fields)} WHERE employee_id = ?"
                                    params = [values[field] for field in values.keys() if field != 'employee_id']
                                    params.append(employee_id)
                                    conn.execute(query, params)
                                else:
                                    # Insert new employee
                                    fields = ', '.join(values.keys())
                                    placeholders = ', '.join(['?' for _ in values])
                                    query = f"INSERT INTO employees ({fields}) VALUES ({placeholders})"
                                    conn.execute(query, list(values.values()))
                                
                                results[table_name]["imported"] += 1
                            except Exception as e:
                                error = f"Error importing employee row: {e}"
                                results[table_name]["errors"].append(error)
                                logger.error(error)
                                results[table_name]["skipped"] += 1
                    
                    elif table_name == "cash_receives":
                        # Import cash receives
                        for _, row in df.iterrows():
                            try:
                                # Skip if required fields are empty
                                if all(pd.isna(row[col]) for col in df.columns):
                                    results[table_name]["skipped"] += 1
                                    continue
                                
                                # Detect column names
                                date_col = next((col for col in df.columns if col.lower() in ['date', 'receipt date']), None)
                                voucher_col = next((col for col in df.columns if col.lower() in ['voucher', 'voucher no', 'receipt no']), None)
                                from_col = next((col for col in df.columns if col.lower() in ['received from', 'from', 'source']), None)
                                amount_col = next((col for col in df.columns if col.lower() in ['amount', 'received amount']), None)
                                desc_col = next((col for col in df.columns if col.lower() in ['description', 'details', 'purpose']), None)
                                receiver_col = next((col for col in df.columns if col.lower() in ['receiver', 'received by']), None)
                                
                                # Skip if amount is missing
                                if not amount_col or pd.isna(row[amount_col]):
                                    results[table_name]["skipped"] += 1
                                    continue
                                
                                # Prepare values
                                values = {}
                                if date_col and pd.notna(row[date_col]):
                                    values['date'] = str(row[date_col])
                                if voucher_col and pd.notna(row[voucher_col]):
                                    values['voucher_number'] = format_scientific_notation(row[voucher_col])
                                if from_col and pd.notna(row[from_col]):
                                    values['received_from'] = str(row[from_col])
                                if amount_col and pd.notna(row[amount_col]):
                                    values['amount'] = float(format_scientific_notation(row[amount_col]))
                                if desc_col and pd.notna(row[desc_col]):
                                    values['description'] = str(row[desc_col])
                                if receiver_col and pd.notna(row[receiver_col]):
                                    values['receiver'] = str(row[receiver_col])
                                
                                # Insert cash receive record
                                if values:
                                    fields = ', '.join(values.keys())
                                    placeholders = ', '.join(['?' for _ in values])
                                    query = f"INSERT INTO cash_receives ({fields}) VALUES ({placeholders})"
                                    conn.execute(query, list(values.values()))
                                    results[table_name]["imported"] += 1
                                else:
                                    results[table_name]["skipped"] += 1
                            except Exception as e:
                                error = f"Error importing cash receive row: {e}"
                                results[table_name]["errors"].append(error)
                                logger.error(error)
                                results[table_name]["skipped"] += 1
                    
                    elif table_name == "cash_payments":
                        # Import cash payments
                        for _, row in df.iterrows():
                            try:
                                # Skip if required fields are empty
                                if all(pd.isna(row[col]) for col in df.columns):
                                    results[table_name]["skipped"] += 1
                                    continue
                                
                                # Detect column names
                                date_col = next((col for col in df.columns if col.lower() in ['date', 'payment date']), None)
                                voucher_col = next((col for col in df.columns if col.lower() in ['voucher', 'voucher no', 'payment no']), None)
                                to_col = next((col for col in df.columns if col.lower() in ['paid to', 'to', 'receiver']), None)
                                amount_col = next((col for col in df.columns if col.lower() in ['amount', 'payment amount']), None)
                                desc_col = next((col for col in df.columns if col.lower() in ['description', 'details', 'purpose']), None)
                                payer_col = next((col for col in df.columns if col.lower() in ['payer', 'paid by']), None)
                                
                                # Skip if amount is missing
                                if not amount_col or pd.isna(row[amount_col]):
                                    results[table_name]["skipped"] += 1
                                    continue
                                
                                # Prepare values
                                values = {}
                                if date_col and pd.notna(row[date_col]):
                                    values['date'] = str(row[date_col])
                                if voucher_col and pd.notna(row[voucher_col]):
                                    values['voucher_number'] = format_scientific_notation(row[voucher_col])
                                if to_col and pd.notna(row[to_col]):
                                    values['paid_to'] = str(row[to_col])
                                if amount_col and pd.notna(row[amount_col]):
                                    values['amount'] = float(format_scientific_notation(row[amount_col]))
                                if desc_col and pd.notna(row[desc_col]):
                                    values['description'] = str(row[desc_col])
                                if payer_col and pd.notna(row[payer_col]):
                                    values['payer'] = str(row[payer_col])
                                
                                # Insert cash payment record
                                if values:
                                    fields = ', '.join(values.keys())
                                    placeholders = ', '.join(['?' for _ in values])
                                    query = f"INSERT INTO cash_payments ({fields}) VALUES ({placeholders})"
                                    conn.execute(query, list(values.values()))
                                    results[table_name]["imported"] += 1
                                else:
                                    results[table_name]["skipped"] += 1
                            except Exception as e:
                                error = f"Error importing cash payment row: {e}"
                                results[table_name]["errors"].append(error)
                                logger.error(error)
                                results[table_name]["skipped"] += 1
                else:
                    logger.warning(f"Sheet '{sheet_name}' not found in Excel file")
            
            # Save import history
            for table_name, result in results.items():
                if result["processed"] > 0:
                    conn.execute(
                        '''INSERT INTO import_history 
                        (file_name, file_path, import_type, records_processed, records_imported, records_skipped, errors)
                        VALUES (?, ?, ?, ?, ?, ?, ?)''',
                        (os.path.basename(filepath), filepath, table_name, 
                        result["processed"], result["imported"], result["skipped"], 
                        json.dumps(result["errors"]))
                    )
            conn.commit()
        
        logger.info("Company data import completed")
        return results
        
    except Exception as e:
        error = f"Error processing company data file: {str(e)}"
        for table_name in results:
            results[table_name]["errors"].append(error)
        logger.error(error)
        return results

def get_all_employees() -> List[Dict[str, Any]]:
    """
    Retrieve all employees from the database.
    
    Returns:
        List of dictionaries containing employee data
    """
    with get_db_connection() as conn:
        employees = conn.execute('SELECT * FROM employees ORDER BY employee_id').fetchall()
        return [dict(employee) for employee in employees]

def get_import_history() -> List[Dict[str, Any]]:
    """
    Retrieve import history from the database.
    
    Returns:
        List of dictionaries containing import history data
    """
    with get_db_connection() as conn:
        history = conn.execute(
            'SELECT * FROM import_history ORDER BY import_date DESC'
        ).fetchall()
        return [dict(entry) for entry in history]

def main():
    """Command-line interface for importing data."""
    if len(sys.argv) < 3:
        print("Usage: python import_utils.py [employees|company] path/to/excel.xlsx")
        sys.exit(1)
    
    import_type = sys.argv[1].lower()
    file_path = sys.argv[2]
    
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} does not exist.")
        sys.exit(1)
    
    if not allowed_file(file_path):
        print(f"Error: File {file_path} is not an Excel file. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}")
        sys.exit(1)
    
    # Initialize database if needed
    init_db()
    
    if import_type == 'employees':
        results = import_employee_data(file_path)
        print(f"Employee import complete.")
        print(f"Processed: {results['processed']}")
        print(f"Imported: {results['imported']}")
        print(f"Skipped: {results['skipped']}")
        if results['errors']:
            print(f"Errors: {len(results['errors'])}")
            for error in results['errors'][:5]:  # Show only first 5 errors
                print(f"  - {error}")
            if len(results['errors']) > 5:
                print(f"  ... and {len(results['errors']) - 5} more errors")
        
    elif import_type == 'company':
        results = import_company_data(file_path)
        print(f"Company data import complete.")
        for sheet, result in results.items():
            if result['processed'] > 0:
                print(f"\nSheet: {sheet}")
                print(f"Processed: {result['processed']}")
                print(f"Imported: {result['imported']}")
                print(f"Skipped: {result['skipped']}")
                if result['errors']:
                    print(f"Errors: {len(result['errors'])}")
                    for error in result['errors'][:3]:  # Show only first 3 errors per sheet
                        print(f"  - {error}")
                    if len(result['errors']) > 3:
                        print(f"  ... and {len(result['errors']) - 3} more errors")
    else:
        print(f"Error: Unknown import type '{import_type}'. Use 'employees' or 'company'.")
        sys.exit(1)

if __name__ == "__main__":
    main()