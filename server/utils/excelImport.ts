import * as XLSX from 'xlsx';
import { InsertEmployee } from '@shared/schema';
import path from 'path';
import fs from 'fs';

export interface ImportResult {
  success: boolean;
  message: string;
  data?: any[];
  errors?: string[];
}

/**
 * Reads and parses an Excel file containing employee data
 * @param filePath Path to the Excel file
 * @returns Parsed employee data in the format expected by the database
 */
export async function readEmployeeExcel(filePath: string): Promise<ImportResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        message: `File not found: ${filePath}`,
        errors: [`File not found: ${filePath}`]
      };
    }

    // Read the file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        message: 'No data found in Excel file',
        errors: ['No data found in Excel file']
      };
    }

    // Map Excel columns to our employee schema
    const employees: Partial<InsertEmployee>[] = [];
    const errors: string[] = [];
    
    rawData.forEach((row: any, index: number) => {
      try {
        // Basic validation
        if (!row.employeeId && !row.firstName && !row.lastName) {
          errors.push(`Row ${index + 2}: Missing required fields`);
          return;
        }
        
        // Map Excel columns to our schema (based on our actual schema)
        const employee: Partial<InsertEmployee> = {
          employeeId: row.employeeId || row.EmployeeID || row['Employee ID'] || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          firstName: row.firstName || row.FirstName || row['First Name'] || '',
          lastName: row.lastName || row.LastName || row['Last Name'] || '',
          designation: row.designation || row.Designation || row.Position || row.JobTitle || row['Job Title'] || '',
          dailyWage: row.dailyWage || row.DailyWage || row['Daily Wage'] || row.Wage || row.Salary || '0',
          mobile: row.mobile || row.Mobile || row.Phone || row['Phone Number'] || '',
          address: row.address || row.Address || '',
          idNumber: row.idNumber || row.IDNumber || row['ID Number'] || null,
          joinDate: row.joinDate || row.JoinDate || row['Join Date'] || row['Start Date'] || new Date().toISOString(),
          projectId: row.projectId || row.ProjectID || row['Project ID'] || null,
          isActive: row.isActive !== undefined ? row.isActive : true
        };
        
        employees.push(employee);
      } catch (err: any) {
        errors.push(`Error processing row ${index + 2}: ${err.message || err}`);
      }
    });

    return {
      success: true,
      message: `Successfully parsed ${employees.length} employees with ${errors.length} errors`,
      data: employees,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to parse Excel file: ${error.message || error}`,
      errors: [`Failed to parse Excel file: ${error.message || error}`]
    };
  }
}

/**
 * Maps field names from Excel to our schema
 * This function allows flexible field name mapping
 * @param excelFieldNames The field names from Excel
 * @param schemaFields The field names in our schema
 * @returns A mapping of Excel field names to schema field names
 */
export function mapFieldNames(excelFieldNames: string[], schemaFields: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // Create common variations of field names based on our schema
  const variations: Record<string, string[]> = {
    employeeId: ['employeeId', 'EmployeeID', 'Employee ID', 'ID', 'Id'],
    firstName: ['firstName', 'FirstName', 'First Name', 'First', 'GivenName', 'Given Name'],
    lastName: ['lastName', 'LastName', 'Last Name', 'Last', 'Surname', 'Family Name'],
    designation: ['designation', 'Designation', 'Position', 'Title', 'JobTitle', 'Job Title'],
    dailyWage: ['dailyWage', 'DailyWage', 'Daily Wage', 'Wage', 'Salary', 'Pay'],
    mobile: ['mobile', 'Mobile', 'Phone', 'PhoneNumber', 'Phone Number', 'Contact', 'Tel'],
    address: ['address', 'Address', 'Location', 'Residence'],
    idNumber: ['idNumber', 'IDNumber', 'ID Number', 'NID', 'Passport', 'Identity'],
    joinDate: ['joinDate', 'JoinDate', 'Join Date', 'Start Date', 'Starting Date', 'Employment Date'],
    projectId: ['projectId', 'ProjectID', 'Project ID', 'Project'],
    isActive: ['isActive', 'IsActive', 'Active', 'Status']
  };
  
  // For each Excel field, find a matching schema field
  excelFieldNames.forEach(excelField => {
    for (const schemaField of schemaFields) {
      if (variations[schemaField] && variations[schemaField].includes(excelField)) {
        mapping[excelField] = schemaField;
        break;
      }
    }
  });
  
  return mapping;
}