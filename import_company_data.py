#!/usr/bin/env python3
"""
Company Data Importer

This script imports data from a Company Book Keeping Excel file into the
database. It handles:
1. Employee details (EmployeeDetails sheet)
2. Cash receives (CashReceive sheet)
3. Cash payments (CashPayments sheet)

Usage:
    python import_company_data.py path/to/excel_file.xlsx

Example:
    python import_company_data.py attached_assets/Cleaned_Company_Book_Keeping_April_2025.xlsx
"""

import os
import sys
import sqlite3
import json
import logging
import argparse
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("company_import.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Database connection
DB_PATH = "instance/attendance.sqlite"

def get_db_connection() -> sqlite3.Connection:
    """Get a connection to the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def format_scientific_notation(value: Any) -> str:
    """
    Convert scientific notation numbers to strings preserving all digits.
    
    Args:
        value: The value to convert
        
    Returns:
        A string representation of the value
    """
    if pd.isna(value):
        return None
    
    # If it's already a string, return it
    if isinstance(value, str):
        return value
    
    # Handle numeric types
    if isinstance(value, (int, float)):
        # Check if in scientific notation
        if abs(value) < 1e-6 or abs(value) > 1e9:
            # For very small or very large numbers, ensure we get the full precision
            return f"{value:.0f}"
        else:
            # For regular numbers, just convert directly
            return str(int(value)) if value.is_integer() else str(value)
    
    # For any other type, convert to string
    return str(value)

def ensure_table_exists(table_name: str) -> None:
    """
    Ensure that the specified table exists in the database.
    
    Args:
        table_name: Name of the table to check
    
    Raises:
        Exception: If the table doesn't exist
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
        if not cursor.fetchone():
            raise Exception(f"Table '{table_name}' does not exist in the database.")

def import_employees(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Import employee data from a DataFrame.
    
    Args:
        df: DataFrame containing employee data
        
    Returns:
        Dict with import statistics
    """
    logger.info("Starting import of employee data")
    
    ensure_table_exists("employees")
    
    # Statistics
    stats = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
    
    # Process each row
    for _, row in df.iterrows():
        stats["total"] += 1
        
        try:
            # Skip row if ID is missing
            if pd.isna(row['id']):
                stats["skipped"] += 1
                logger.warning(f"Skipping row: Missing employee ID")
                continue
                
            # Format the employee ID to handle scientific notation
            employee_id = format_scientific_notation(row['id'])
                
            # Process NID (potentially in scientific notation)
            nid = format_scientific_notation(row['nid']) if 'nid' in row and not pd.isna(row['nid']) else None
            
            # Format addresses as JSON if it's not empty
            addresses = json.dumps(row['addresses']) if 'addresses' in row and not pd.isna(row['addresses']) else None
            
            # Format loan/advance
            loan_advance = float(row['loan/advance']) if 'loan/advance' in row and not pd.isna(row['loan/advance']) else 0.0
            
            # Format date of join (handle various date formats)
            date_of_join = None
            if 'date_of_join' in row and not pd.isna(row['date_of_join']):
                try:
                    # Try parsing the date
                    if isinstance(row['date_of_join'], datetime):
                        date_of_join = row['date_of_join'].strftime('%Y-%m-%d')
                    else:
                        # Try different date formats
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y']:
                            try:
                                date_of_join = datetime.strptime(str(row['date_of_join']), fmt).strftime('%Y-%m-%d')
                                break
                            except ValueError:
                                continue
                except Exception as e:
                    logger.warning(f"Could not parse date_of_join for employee {employee_id}: {e}")
            
            # Prepare data for insertion
            employee_data = {
                "id": employee_id,
                "name": row['name'] if not pd.isna(row['name']) else "Unknown",
                "salary": float(row['salary']) if 'salary' in row and not pd.isna(row['salary']) else None,
                "mobile": str(row['mobile']) if 'mobile' in row and not pd.isna(row['mobile']) else None,
                "nid": nid,
                "designation": row['designation'] if 'designation' in row and not pd.isna(row['designation']) else None,
                "date_of_join": date_of_join,
                "addresses": addresses,
                "loan_advance": loan_advance
            }
            
            # Insert or update the employee record
            with get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Check if employee already exists
                cursor.execute("SELECT id FROM employees WHERE id = ?", (employee_id,))
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing employee
                    query = """
                    UPDATE employees 
                    SET name = ?, salary = ?, mobile = ?, nid = ?, designation = ?, 
                        date_of_join = ?, addresses = ?, loan_advance = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """
                    cursor.execute(query, (
                        employee_data["name"], employee_data["salary"], employee_data["mobile"],
                        employee_data["nid"], employee_data["designation"], employee_data["date_of_join"],
                        employee_data["addresses"], employee_data["loan_advance"], employee_id
                    ))
                    logger.info(f"Updated employee: {employee_id} - {employee_data['name']}")
                else:
                    # Insert new employee
                    query = """
                    INSERT INTO employees (id, name, salary, mobile, nid, designation, date_of_join, addresses, loan_advance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """
                    cursor.execute(query, (
                        employee_id, employee_data["name"], employee_data["salary"], employee_data["mobile"],
                        employee_data["nid"], employee_data["designation"], employee_data["date_of_join"],
                        employee_data["addresses"], employee_data["loan_advance"]
                    ))
                    logger.info(f"Inserted new employee: {employee_id} - {employee_data['name']}")
                
                stats["successful"] += 1
                
        except Exception as e:
            stats["failed"] += 1
            error_msg = f"Error processing employee row: {str(e)}"
            stats["errors"].append(error_msg)
            logger.error(error_msg)
    
    logger.info(f"Employee import completed. Total: {stats['total']}, Successful: {stats['successful']}, Failed: {stats['failed']}, Skipped: {stats['skipped']}")
    return stats

def import_cash_receives(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Import cash receive data from a DataFrame.
    
    Args:
        df: DataFrame containing cash receive data
        
    Returns:
        Dict with import statistics
    """
    logger.info("Starting import of cash receive data")
    
    ensure_table_exists("cash_receives")
    
    # Statistics
    stats = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
    
    # Process each row
    for _, row in df.iterrows():
        stats["total"] += 1
        
        try:
            # Skip row if amount is missing
            if 'amount' not in row or pd.isna(row['amount']):
                stats["skipped"] += 1
                logger.warning(f"Skipping cash receive row: Missing amount")
                continue
            
            # Format date
            receive_date = None
            if 'date' in row and not pd.isna(row['date']):
                try:
                    # Try parsing the date
                    if isinstance(row['date'], datetime):
                        receive_date = row['date'].strftime('%Y-%m-%d')
                    else:
                        # Try different date formats
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y']:
                            try:
                                receive_date = datetime.strptime(str(row['date']), fmt).strftime('%Y-%m-%d')
                                break
                            except ValueError:
                                continue
                except Exception as e:
                    logger.warning(f"Could not parse date for cash receive: {e}")
                    
            if not receive_date:
                receive_date = datetime.now().strftime('%Y-%m-%d')
            
            # Format employee ID if present
            employee_id = None
            if 'employee_id' in row and not pd.isna(row['employee_id']):
                employee_id = format_scientific_notation(row['employee_id'])
                
                # Verify employee exists
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM employees WHERE id = ?", (employee_id,))
                    if not cursor.fetchone():
                        logger.warning(f"Cash receive references unknown employee ID: {employee_id}")
                        employee_id = None
            
            # Prepare data for insertion
            cash_receive_data = {
                "date": receive_date,
                "employee_id": employee_id,
                "description": row['description'] if 'description' in row and not pd.isna(row['description']) else None,
                "media": row['media'] if 'media' in row and not pd.isna(row['media']) else None,
                "amount": float(row['amount']),
                "remarks": row['remarks'] if 'remarks' in row and not pd.isna(row['remarks']) else None
            }
            
            # Insert the cash receive record
            with get_db_connection() as conn:
                cursor = conn.cursor()
                query = """
                INSERT INTO cash_receives (date, employee_id, description, media, amount, remarks)
                VALUES (?, ?, ?, ?, ?, ?)
                """
                cursor.execute(query, (
                    cash_receive_data["date"], cash_receive_data["employee_id"], 
                    cash_receive_data["description"], cash_receive_data["media"],
                    cash_receive_data["amount"], cash_receive_data["remarks"]
                ))
                
                logger.info(f"Inserted cash receive: {cash_receive_data['amount']} on {cash_receive_data['date']}")
                stats["successful"] += 1
                
        except Exception as e:
            stats["failed"] += 1
            error_msg = f"Error processing cash receive row: {str(e)}"
            stats["errors"].append(error_msg)
            logger.error(error_msg)
    
    logger.info(f"Cash receive import completed. Total: {stats['total']}, Successful: {stats['successful']}, Failed: {stats['failed']}, Skipped: {stats['skipped']}")
    return stats

def import_cash_payments(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Import cash payment data from a DataFrame.
    
    Args:
        df: DataFrame containing cash payment data
        
    Returns:
        Dict with import statistics
    """
    logger.info("Starting import of cash payment data")
    
    ensure_table_exists("cash_payments")
    
    # Statistics
    stats = {
        "total": 0,
        "successful": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
    
    # Process each row
    for _, row in df.iterrows():
        stats["total"] += 1
        
        try:
            # Skip row if amount is missing
            if 'amount' not in row or pd.isna(row['amount']):
                stats["skipped"] += 1
                logger.warning(f"Skipping cash payment row: Missing amount")
                continue
            
            # Format date
            payment_date = None
            if 'date' in row and not pd.isna(row['date']):
                try:
                    # Try parsing the date
                    if isinstance(row['date'], datetime):
                        payment_date = row['date'].strftime('%Y-%m-%d')
                    else:
                        # Try different date formats
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%m-%d-%Y']:
                            try:
                                payment_date = datetime.strptime(str(row['date']), fmt).strftime('%Y-%m-%d')
                                break
                            except ValueError:
                                continue
                except Exception as e:
                    logger.warning(f"Could not parse date for cash payment: {e}")
                    
            if not payment_date:
                payment_date = datetime.now().strftime('%Y-%m-%d')
            
            # Format employee ID if present
            employee_id = None
            if 'employee_id' in row and not pd.isna(row['employee_id']):
                employee_id = format_scientific_notation(row['employee_id'])
                
                # Verify employee exists
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM employees WHERE id = ?", (employee_id,))
                    if not cursor.fetchone():
                        logger.warning(f"Cash payment references unknown employee ID: {employee_id}")
                        employee_id = None
            
            # Get name (either from row or from employee)
            name = None
            if 'name' in row and not pd.isna(row['name']):
                name = row['name']
            elif employee_id:
                # Look up employee name
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT name FROM employees WHERE id = ?", (employee_id,))
                    result = cursor.fetchone()
                    if result:
                        name = result['name']
            
            # If we still don't have a name, use "Unknown"
            if not name:
                name = "Unknown"
            
            # Prepare data for insertion
            cash_payment_data = {
                "date": payment_date,
                "employee_id": employee_id,
                "name": name,
                "amount": float(row['amount'])
            }
            
            # Insert the cash payment record
            with get_db_connection() as conn:
                cursor = conn.cursor()
                query = """
                INSERT INTO cash_payments (date, employee_id, name, amount)
                VALUES (?, ?, ?, ?)
                """
                cursor.execute(query, (
                    cash_payment_data["date"], cash_payment_data["employee_id"], 
                    cash_payment_data["name"], cash_payment_data["amount"]
                ))
                
                logger.info(f"Inserted cash payment: {cash_payment_data['amount']} to {cash_payment_data['name']} on {cash_payment_data['date']}")
                stats["successful"] += 1
                
        except Exception as e:
            stats["failed"] += 1
            error_msg = f"Error processing cash payment row: {str(e)}"
            stats["errors"].append(error_msg)
            logger.error(error_msg)
    
    logger.info(f"Cash payment import completed. Total: {stats['total']}, Successful: {stats['successful']}, Failed: {stats['failed']}, Skipped: {stats['skipped']}")
    return stats

def import_excel_file(filepath: str) -> Dict[str, Dict[str, Any]]:
    """
    Import data from Excel file.
    
    Args:
        filepath: Path to the Excel file
        
    Returns:
        Dict with import statistics for each sheet
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
    
    logger.info(f"Reading Excel file: {filepath}")
    
    # Prepare results
    results = {}
    
    try:
        # Open the Excel file
        excel_file = pd.ExcelFile(filepath)
        
        # Check for required sheets
        required_sheets = ['EmployeeDetails', 'CashReceive', 'CashPayments']
        missing_sheets = [sheet for sheet in required_sheets if sheet not in excel_file.sheet_names]
        
        if missing_sheets:
            logger.warning(f"Missing required sheets: {', '.join(missing_sheets)}")
        
        # Process EmployeeDetails sheet if available
        if 'EmployeeDetails' in excel_file.sheet_names:
            logger.info("Processing EmployeeDetails sheet")
            df = pd.read_excel(excel_file, 'EmployeeDetails')
            df.columns = [col.lower().strip() for col in df.columns]
            
            # Handle missing required columns
            required_columns = ['id', 'name']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                logger.error(f"EmployeeDetails sheet missing required columns: {', '.join(missing_columns)}")
            else:
                # Process employee data
                results['employees'] = import_employees(df)
        
        # Process CashReceive sheet if available
        if 'CashReceive' in excel_file.sheet_names:
            logger.info("Processing CashReceive sheet")
            df = pd.read_excel(excel_file, 'CashReceive')
            df.columns = [col.lower().strip() for col in df.columns]
            
            # Handle missing required columns
            required_columns = ['date', 'amount']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                logger.error(f"CashReceive sheet missing required columns: {', '.join(missing_columns)}")
            else:
                # Process cash receive data
                results['cash_receives'] = import_cash_receives(df)
        
        # Process CashPayments sheet if available
        if 'CashPayments' in excel_file.sheet_names:
            logger.info("Processing CashPayments sheet")
            df = pd.read_excel(excel_file, 'CashPayments')
            df.columns = [col.lower().strip() for col in df.columns]
            
            # Handle missing required columns
            required_columns = ['date', 'amount']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                logger.error(f"CashPayments sheet missing required columns: {', '.join(missing_columns)}")
            else:
                # Process cash payment data
                results['cash_payments'] = import_cash_payments(df)
                
    except Exception as e:
        logger.error(f"Error processing Excel file: {str(e)}")
        raise
    
    return results

def main():
    """Main function to run the script from command line."""
    parser = argparse.ArgumentParser(description='Import company data from Excel file')
    parser.add_argument('file', help='Path to the Excel file')
    args = parser.parse_args()
    
    try:
        # Ensure database file exists
        if not os.path.exists(DB_PATH):
            logger.error(f"Database file not found: {DB_PATH}")
            sys.exit(1)
        
        # Import data from Excel file
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
        logger.error(f"Error in main: {str(e)}")
        print(f"\nError: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()