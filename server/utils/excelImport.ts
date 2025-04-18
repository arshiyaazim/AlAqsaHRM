import { read, utils } from 'xlsx';
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
    const workbook = read(fs.readFileSync(filePath));
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = utils.sheet_to_json(worksheet);
    
    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        message: 'No data found in Excel file',
        errors: ['No data found in Excel file']
      };
    }

    // Map Excel columns to our employee schema based on specific requirements
    const employees: Partial<InsertEmployee>[] = [];
    const errors: string[] = [];
    let startEmployeeId = 1001; // Start employee IDs from 1001
    
    // Process each row in the Excel sheet
    for (let index = 0; index < rawData.length; index++) {
      const row: any = rawData[index];
      
      try {
        // Get the mobile number from column A
        const mobileValue = row['__EMPTY'] || row.A || ''; // Excel sometimes uses __EMPTY for the first column
        
        // Stop processing if column A is empty (no more employees)
        if (!mobileValue || mobileValue.toString().trim() === '') {
          console.log(`Stopping import at row ${index + 2} due to empty mobile number (column A)`);
          break;
        }
        
        // Extract data from specific columns according to requirements
        // Column B - Employee name (split into first and last name)
        const fullName = (row['__EMPTY_1'] || row.B || '').toString().trim();
        let firstName = fullName;
        let lastName = '';
        
        // Attempt to split name into first and last name
        if (fullName.includes(' ')) {
          const nameParts = fullName.split(' ');
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
        
        // Column C - Salary/Daily Wage
        const dailyWage = (row['__EMPTY_2'] || row.C || 0).toString();
        
        // Column E - NID/BRC No.
        const idNumber = (row['__EMPTY_4'] || row.E || '').toString();
        
        // Column F - Designation
        const designation = (row['__EMPTY_5'] || row.F || '').toString();
        
        // Column H - Date of Join
        let joinDate = row['__EMPTY_7'] || row.H || new Date().toISOString();
        if (joinDate instanceof Date) {
          joinDate = joinDate.toISOString();
        } else if (typeof joinDate === 'number') {
          // If it's an Excel date number
          const excelDate = XLSX.SSF.parse_date_code(joinDate);
          const jsDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
          joinDate = jsDate.toISOString();
        }
        
        // Column I - Address
        const address = (row['__EMPTY_8'] || row.I || '').toString();
        
        // Column M - Loan/Advance (if applicable)
        const loanAdvance = (row['__EMPTY_12'] || row.M || 0).toString();
        
        // Auto-generate employee ID (EMP-XXXX)
        const employeeId = `EMP-${startEmployeeId++}`;
        
        // Create employee object
        const employee: Partial<InsertEmployee> = {
          employeeId,
          firstName,
          lastName,
          designation,
          dailyWage,
          mobile: mobileValue.toString(),
          address,
          idNumber,
          joinDate,
          projectId: null, // Will need to be assigned later
          isActive: true,
          loanAdvance: loanAdvance // Added to schema
        };
        
        employees.push(employee);
      } catch (err: any) {
        errors.push(`Error processing row ${index + 2}: ${err.message || err}`);
      }
    }

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