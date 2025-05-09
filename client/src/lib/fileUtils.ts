import * as XLSX from 'xlsx';

export interface Employee {
  name: string;
  email?: string;
  department?: string;
  position?: string;
  [key: string]: any;
}

/**
 * Directly imports employee data from an Excel file buffer
 * @param buffer - The file buffer containing Excel data
 * @returns Array of employee objects
 */
export function directImportEmployeesFromExcel(buffer: Buffer): Employee[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Employee>(sheet, { defval: '' });
  return data;
}

/**
 * Import employees from an Excel file using the server API
 * @param file - The Excel file to import
 * @returns Promise resolving to the API response
 */
export async function importEmployeesFromExcel(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/employees/import', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Import failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Check if a file has an allowed extension
 * @param filename - The filename to check
 * @param allowedExtensions - Array of allowed extensions
 * @returns Boolean indicating if the file has an allowed extension
 */
export function hasAllowedExtension(filename: string, allowedExtensions: string[] = ['.xlsx', '.xls', '.csv']): boolean {
  const extension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  return allowedExtensions.includes(extension);
}

/**
 * Format file size into a user-friendly string
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places to show
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}