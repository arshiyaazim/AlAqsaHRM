import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ShipDuty } from '@shared/schema';

interface ShipDutyExportConfig {
  duties: ShipDuty[];
  employeeNames: Record<number, string>;
  projectName: string;
  fromDate?: Date;
  toDate?: Date;
  includeConveyance?: boolean;
}

export function exportShipDutiesToExcel({
  duties,
  employeeNames,
  projectName,
  fromDate,
  toDate,
  includeConveyance = true
}: ShipDutyExportConfig): void {
  // Sort duties by date
  const sortedDuties = [...duties].sort((a, b) => 
    new Date(a.dutyDate).getTime() - new Date(b.dutyDate).getTime()
  );
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Format data for Excel
  const exportData = sortedDuties.map(duty => {
    const employeeName = employeeNames[duty.employeeId] || `Employee #${duty.employeeId}`;
    const dutyDate = format(new Date(duty.dutyDate), 'MMM dd, yyyy');
    
    return {
      'Date': dutyDate,
      'Vessel Name': duty.vesselName,
      'Lighter Name': duty.lighterName || '',
      'Employee': employeeName,
      'Duty Hours': Number(duty.dutyHours),
      'Salary Rate (৳)': Number(duty.salaryRate),
      'Amount (৳)': Number(duty.dutyHours) * Number(duty.salaryRate),
      'Conveyance (৳)': Number(duty.conveyanceAmount),
      'Release Point': duty.releasePoint || '',
      'Remarks': duty.remarks || ''
    };
  });
  
  // Calculate totals
  const totalDutyHours = sortedDuties.reduce((sum, duty) => sum + Number(duty.dutyHours), 0);
  const totalAmount = sortedDuties.reduce((sum, duty) => sum + (Number(duty.dutyHours) * Number(duty.salaryRate)), 0);
  const totalConveyance = sortedDuties.reduce((sum, duty) => sum + Number(duty.conveyanceAmount), 0);
  
  // Add total row
  exportData.push({
    'Date': 'TOTAL',
    'Vessel Name': '',
    'Lighter Name': '',
    'Employee': '',
    'Duty Hours': totalDutyHours,
    'Salary Rate (৳)': '',
    'Amount (৳)': totalAmount,
    'Conveyance (৳)': totalConveyance,
    'Release Point': '',
    'Remarks': ''
  });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // Set column widths
  const colWidths = [
    { wch: 12 }, // Date
    { wch: 20 }, // Vessel Name
    { wch: 15 }, // Lighter Name
    { wch: 20 }, // Employee
    { wch: 10 }, // Duty Hours
    { wch: 12 }, // Salary Rate
    { wch: 12 }, // Amount
    { wch: 12 }, // Conveyance
    { wch: 15 }, // Release Point
    { wch: 30 }, // Remarks
  ];
  ws['!cols'] = colWidths;
  
  // Create header row with title
  const dateRange = fromDate && toDate 
    ? `${format(fromDate, 'MMM dd, yyyy')} - ${format(toDate, 'MMM dd, yyyy')}`
    : format(new Date(), 'MMMM yyyy');
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Ship Duties');
  
  // Generate filename
  const fileName = `Ship_Duties_${projectName.replace(/\s+/g, '_')}_${format(new Date(), 'MMM_yyyy')}.xlsx`;
  
  // Create Excel file and trigger download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([wbOut], { type: 'application/octet-stream' }), fileName);
}