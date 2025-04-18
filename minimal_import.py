#!/usr/bin/env python3
"""
Minimal Employee Data Importer

This script provides the core functionality to read and process employee 
data from an Excel file without any web interface or database storage.
It simply reads the data and returns it as a list of dictionaries.

Usage:
    python minimal_import.py path/to/excel_file.xlsx

Example:
    python minimal_import.py attached_assets/EmployeeDetails.xlsx
"""

import sys
import pandas as pd
import os
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def import_excel_data(filepath):
    """
    Import employee data from Excel file.
    
    Args:
        filepath: Path to the Excel file
        
    Returns:
        list: A list of dictionaries containing employee data
    """
    try:
        # Check if file exists
        if not os.path.exists(filepath):
            logger.error(f"File not found: {filepath}")
            return []
            
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
        
        # Process each valid row
        imported_count = 0
        skipped_count = 0
        errors = []
        employees = []
        
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
                employee_data["Employee ID"] = employee_id
                
                # Name (Column B)
                name_column = "Name" if "Name" in row.index else None
                employee_data["Name"] = str(row[name_column]) if name_column and pd.notna(row[name_column]) else ""
                
                # Daily Wage (Column C)
                wage_column = "Daily Wage" if "Daily Wage" in row.index else None
                try:
                    employee_data["Daily Wage"] = float(row[wage_column]) if wage_column and pd.notna(row[wage_column]) else None
                except (ValueError, TypeError):
                    employee_data["Daily Wage"] = None
                
                # Mobile Number (Column D)
                mobile_column = "Mobile Number" if "Mobile Number" in row.index else None
                employee_data["Mobile Number"] = str(row[mobile_column]) if mobile_column and pd.notna(row[mobile_column]) else ""
                
                # NID/Passport (Column E)
                nid_column = "NID / Passport Number" if "NID / Passport Number" in row.index else None
                employee_data["NID / Passport Number"] = str(row[nid_column]) if nid_column and pd.notna(row[nid_column]) else ""
                
                # Designation (Column F)
                designation_column = "Designation" if "Designation" in row.index else None
                employee_data["Designation"] = str(row[designation_column]) if designation_column and pd.notna(row[designation_column]) else ""
                
                # Join Date (Column H)
                join_date_column = "Join Date" if "Join Date" in row.index else None
                if join_date_column and pd.notna(row[join_date_column]):
                    try:
                        if isinstance(row[join_date_column], datetime):
                            employee_data["Join Date"] = row[join_date_column].strftime("%Y-%m-%d")
                        else:
                            employee_data["Join Date"] = pd.to_datetime(row[join_date_column]).strftime("%Y-%m-%d")
                    except:
                        employee_data["Join Date"] = None
                else:
                    employee_data["Join Date"] = None
                
                # Log the data being processed
                logger.info(f"Processing row {index+1}: ID={employee_data['Employee ID']}, Name={employee_data['Name']}")
                
                employees.append(employee_data)
                imported_count += 1
                
            except Exception as e:
                logger.error(f"Error processing row {index+1}: {str(e)}")
                errors.append(f"Row {index+1}: {str(e)}")
                skipped_count += 1
        
        # Print summary
        logger.info(f"Import completed: {imported_count} imported, {skipped_count} skipped, {len(errors)} errors")
        
        return employees
        
    except Exception as e:
        logger.error(f"Error importing Excel file: {str(e)}")
        return []

def main():
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python minimal_import.py path/to/excel_file.xlsx")
        return
    
    # Get the Excel file path from command line
    excel_file = sys.argv[1]
    
    # Create output file for saving results
    output_file = "imported_employees.json"
    
    # Import the data
    employees = import_excel_data(excel_file)
    
    # Print the result summary
    if employees:
        print(f"\n✅ Successfully imported {len(employees)} employees")
        
        # First 5 employees
        print("\nSample data (first 5 employees):")
        for i, emp in enumerate(employees[:5]):
            print(f"{i+1}. {emp['Employee ID']} - {emp['Name']}")
            
        # Save all data to file instead of printing to console
        with open(output_file, 'w') as f:
            json.dump(employees, f, indent=2)
            
        print(f"\nComplete data saved to {output_file}")
    else:
        print("\n❌ No valid employee data found in the Excel file")

if __name__ == "__main__":
    main()