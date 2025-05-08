import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// Function to standardize filename creation
export function createFileName(baseName: string, extension: string, timestamp = true): string {
  const baseNameCleaned = baseName.replace(/\s+/g, '_');
  const timestampStr = timestamp ? `_${format(new Date(), 'yyyy-MM-dd')}` : '';
  return `${baseNameCleaned}${timestampStr}.${extension}`;
}

// Download a blob with a specified filename
export function downloadBlob(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}

// Function to convert date string to a date object safely
export function safeDateParse(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch (e) {
    return new Date();
  }
}

// Format a number as currency (BDT)
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `৳${numValue.toFixed(2)}`;
}

// Format a percentage
export function formatPercentage(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2)}%`;
}