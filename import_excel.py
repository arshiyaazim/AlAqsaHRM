#!/usr/bin/env python3
"""
Simple Excel Import Script

This script provides a minimal implementation to import employee data 
from an Excel file according to the specified requirements.

Usage:
    python import_excel.py path/to/excel_file.xlsx
    
Example:
    python import_excel.py attached_assets/EmployeeDetails.xlsx
"""

import sys
import pandas as pd
import json
from datetime import datetime

def import_employees(excel_path):
    """
    Import employee data from Excel file.
    
    Args:
        excel_path: Path to the Excel file
        
    Returns:
        list: A list of dictionaries containing employee data
    """
    try:
        # Read the Excel file, attempt to use "EmployeeDetails" sheet first
        try:
            df = pd.read_excel(excel_path, sheet_name="EmployeeDetails")
            print(f"Successfully loaded sheet 'EmployeeDetails'")
        except Exception as e:
            # If that fails, try the first sheet
            print(f"Sheet 'EmployeeDetails' not found: {e}. Using first sheet.")
            df = pd.read_excel(excel_path)
        
        # Print info about the file
        print(f"Loaded Excel file: {excel_path}")
        print(f"Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        print(f"Columns found: {df.columns.tolist()}")
        
        # Extract necessary columns - handle different column names
        # First define mapping of possible column names
        column_mappings = {
            'Employee ID': ['Employee ID', 'EmployeeID', 'ID', 'Employee Id', df.columns[0]],
            'Name': ['Name', 'Employee Name', 'Full Name', 'EMPLOYEE NAME'],
            'Daily Wage': ['Daily Wage', 'Wage', 'Salary', 'Pay', 'SALARY', 'WAGE'],
            'Mobile Number': ['Mobile Number', 'Mobile', 'Phone', 'Contact', 'MOBILE'],
            'NID / Passport Number': ['NID / Passport Number', 'NID', 'Passport', 'ID Number', 'NID No.'],
            'Designation': ['Designation', 'Position', 'Job Title', 'Role'],
            'Join Date': ['Join Date', 'Joining Date', 'Start Date', 'Date of Join']
        }
        
        # Create a dictionary to store our standardized column names
        column_indices = {}
        
        # For each of our desired output columns
        for standard_name, possible_names in column_mappings.items():
            # Try to find a matching column name in the dataframe
            for name in possible_names:
                if name in df.columns:
                    column_indices[standard_name] = name
                    break
        
        # Print the columns we've identified
        print("\nIdentified columns:")
        for standard_name, found_name in column_indices.items():
            print(f"  {standard_name} -> {found_name}")
        
        # Filter rows where Employee ID is not empty
        if 'Employee ID' in column_indices:
            emp_id_col = column_indices['Employee ID']
            valid_df = df[df[emp_id_col].notna()]
            print(f"\nFound {len(valid_df)} rows with non-empty Employee ID")
        else:
            print("Error: Could not find Employee ID column")
            return []
        
        # Initialize list to store employee data
        employees = []
        
        # Process each row
        for index, row in valid_df.iterrows():
            # Get Employee ID (required)
            employee_id = str(row[emp_id_col]).strip()
            
            # Skip entirely if Employee ID is empty after stripping
            if not employee_id:
                continue
            
            # Create employee record
            employee = {
                "Employee ID": employee_id
            }
            
            # Extract other fields (all optional)
            if 'Name' in column_indices and pd.notna(row[column_indices['Name']]):
                employee["Name"] = str(row[column_indices['Name']])
            
            if 'Daily Wage' in column_indices and pd.notna(row[column_indices['Daily Wage']]):
                try:
                    employee["Daily Wage"] = float(row[column_indices['Daily Wage']])
                except (ValueError, TypeError):
                    # Keep as string if conversion fails
                    employee["Daily Wage"] = str(row[column_indices['Daily Wage']])
            
            if 'Mobile Number' in column_indices and pd.notna(row[column_indices['Mobile Number']]):
                employee["Mobile Number"] = str(row[column_indices['Mobile Number']])
            
            if 'NID / Passport Number' in column_indices and pd.notna(row[column_indices['NID / Passport Number']]):
                employee["NID / Passport Number"] = str(row[column_indices['NID / Passport Number']])
            
            if 'Designation' in column_indices and pd.notna(row[column_indices['Designation']]):
                employee["Designation"] = str(row[column_indices['Designation']])
            
            if 'Join Date' in column_indices and pd.notna(row[column_indices['Join Date']]):
                try:
                    # Try to parse date
                    if isinstance(row[column_indices['Join Date']], datetime):
                        employee["Join Date"] = row[column_indices['Join Date']].strftime("%Y-%m-%d")
                    else:
                        date_obj = pd.to_datetime(row[column_indices['Join Date']])
                        employee["Join Date"] = date_obj.strftime("%Y-%m-%d")
                except Exception as e:
                    # If date parsing fails, store as string
                    employee["Join Date"] = str(row[column_indices['Join Date']])
            
            # Add to the list
            employees.append(employee)
        
        print(f"\nSuccessfully processed {len(employees)} employees")
        return employees
    
    except Exception as e:
        print(f"Error: {e}")
        return []

def main():
    """Main function to run the script from command line."""
    if len(sys.argv) < 2:
        print("Usage: python import_excel.py path/to/excel_file.xlsx")
        return
    
    excel_path = sys.argv[1]
    
    print(f"Starting import from: {excel_path}")
    employees = import_employees(excel_path)
    
    if employees:
        # Save to JSON file
        output_file = "imported_employees.json"
        with open(output_file, 'w') as f:
            json.dump(employees, f, indent=2)
        
        print(f"\nResults:")
        print(f"- Imported: {len(employees)} employees")
        print(f"- Data saved to: {output_file}")
        
        # Print sample
        print("\nSample (first 5 employees):")
        for i, emp in enumerate(employees[:5]):
            print(f"{i+1}. {emp['Employee ID']} - {emp.get('Name', 'N/A')}")
    else:
        print("\nNo employees were imported. Please check the file format.")

if __name__ == "__main__":
    main()