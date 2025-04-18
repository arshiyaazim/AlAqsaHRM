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
    
    console.log('Excel workbook loaded with sheets:', workbook.SheetNames);
    
    if (workbook.SheetNames.length === 0) {
      return {
        success: false,
        message: 'No sheets found in Excel file',
        errors: ['No sheets found in Excel file']
      };
    }
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log('Using sheet:', sheetName);
    console.log('Worksheet structure:', Object.keys(worksheet).filter(k => !k.startsWith('!')));
    
    // Convert to JSON with header: 1 option to get raw rows with column values
    const rawData = utils.sheet_to_json(worksheet, { 
      header: 1,
      raw: true, // Get raw values instead of formatted values
      cellDates: true, // Parse dates as JS Date objects
      defval: null // Default value for empty cells
    }); 
    
    console.log('Raw data rows:', rawData.length);
    if (rawData.length > 0) {
      console.log('First row sample:', JSON.stringify(rawData[0]));
      if (rawData.length > 1) {
        console.log('Second row sample:', JSON.stringify(rawData[1]));
      }
    }
    
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
    
    // Skip header row (index 0)
    // Process each row in the Excel sheet starting from index 1 (second row)
    for (let index = 1; index < rawData.length; index++) {
      const row: any[] = rawData[index];
      
      console.log(`Processing row ${index + 1}:`, JSON.stringify(row));
      
      try {
        // Since we're using header: 1, row is now an array of values
        // Get the mobile number from column A (index 0)
        const mobileValue = row[0] || '';
        
        // Skip this row if column A is empty, but continue processing other rows
        if (!mobileValue || mobileValue.toString().trim() === '') {
          console.log(`Skipping row ${index + 1} due to empty mobile number (column A), but continuing import`);
          continue;
        }
        
        // Extract data from specific columns according to requirements
        // Column B (index 1) - Employee name (split into first and last name)
        const fullName = (row[1] || '').toString().trim();
        let firstName = fullName;
        let lastName = '';
        
        // Attempt to split name into first and last name
        if (fullName.includes(' ')) {
          const nameParts = fullName.split(' ');
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
        
        // Column C (index 2) - Salary/Daily Wage
        const dailyWage = (row[2] || 0).toString();
        
        // Column E (index 4) - NID/BRC No.
        const idNumber = (row[4] || '').toString();
        
        // Column F (index 5) - Designation
        const designation = (row[5] || '').toString();
        
        // Column H (index 7) - Date of Join - Use today's date if not provided or invalid
        let joinDate = new Date().toISOString();
        
        try {
          if (row[7]) {
            if (row[7] instanceof Date) {
              joinDate = row[7].toISOString();
            } else if (typeof row[7] === 'number') {
              // If it's an Excel date number (Excel dates are stored as days since 1/1/1900)
              const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
              const jsDate = new Date(excelEpoch);
              jsDate.setDate(excelEpoch.getDate() + row[7]);
              joinDate = jsDate.toISOString();
            } else if (typeof row[7] === 'string') {
              // Try to parse as date string
              const parsedDate = new Date(row[7]);
              if (!isNaN(parsedDate.getTime())) {
                joinDate = parsedDate.toISOString();
              }
            }
          }
        } catch (dateError) {
          console.warn(`Could not parse join date for row ${index + 1}, using today's date instead:`, dateError);
        }
        
        // Column I (index 8) - Address
        const address = (row[8] || '').toString();
        
        // Column M (index 12) - Loan/Advance (if applicable)
        const loanAdvance = (row[12] || 0).toString();
        
        // Use the mobile number as the employee ID as per company requirements
        // Only generate EMP-XXXX if mobile is not in the format we expect
        let employeeId = mobileValue.toString();
        
        // If it doesn't look like a mobile number, use the auto-generated format
        if (!/^\d{10,15}$/.test(employeeId.replace(/\D/g, ''))) {
          employeeId = `EMP-${startEmployeeId++}`;
        }
        
        // Create employee object
        const employee: Partial<InsertEmployee> = {
          employeeId,  // Use mobile number as employeeId
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