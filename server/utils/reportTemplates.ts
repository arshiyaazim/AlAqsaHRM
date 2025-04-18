/**
 * Report Templates System
 * 
 * This module provides functionality to manage and render report templates
 * for various data types in the attendance tracking system.
 */

import { Employee, Project, Attendance, Payroll, Payment, Expenditure, Income } from "../../shared/schema";

// Template interface for all report templates
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'payroll' | 'employee' | 'project' | 'expenditure' | 'income' | 'custom';
  config: ReportConfig;
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
}

// Configuration for each report template
export interface ReportConfig {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  groupBy?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: ReportFilter[];
  showTotals?: boolean;
  showAverages?: boolean;
  pageSize?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  dateFormat?: string;
  headerLogo?: boolean;
  footerText?: string;
  styles?: ReportStyles;
}

// Column definition for reports
export interface ReportColumn {
  key: string;
  title: string;
  width?: number;
  format?: 'text' | 'date' | 'currency' | 'number' | 'percentage';
  visible?: boolean;
  align?: 'left' | 'center' | 'right';
  computeTotal?: boolean;
  formatter?: (value: any, row?: any) => string;
}

// Filter definition for reports
export interface ReportFilter {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in';
  value: any;
}

// Style definitions for reports
export interface ReportStyles {
  headerBgColor?: string;
  headerTextColor?: string;
  rowBgColor?: string;
  rowAltBgColor?: string;
  rowTextColor?: string;
  borderColor?: string;
  footerBgColor?: string;
  footerTextColor?: string;
}

// Default templates for various report types
export const defaultTemplates: ReportTemplate[] = [
  // Attendance Report Template
  {
    id: 'default-attendance',
    name: 'Standard Attendance Report',
    description: 'Shows attendance records with date, time, employee, and project details.',
    type: 'attendance',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      title: 'Attendance Report',
      subtitle: 'Daily attendance records',
      columns: [
        { key: 'date', title: 'Date', format: 'date', width: 15 },
        { key: 'employeeName', title: 'Employee Name', width: 25 },
        { key: 'employeeId', title: 'Employee ID', width: 15 },
        { key: 'projectName', title: 'Project', width: 25 },
        { key: 'clockIn', title: 'Clock In', format: 'date', width: 15 },
        { key: 'clockOut', title: 'Clock Out', format: 'date', width: 15 },
        { key: 'duration', title: 'Duration (Hours)', format: 'number', width: 15, computeTotal: true, align: 'right' },
      ],
      groupBy: 'date',
      sortBy: 'date',
      sortDirection: 'desc',
      showTotals: true,
      pageSize: 'a4',
      orientation: 'landscape',
      dateFormat: 'MM/DD/YYYY',
      headerLogo: true,
      footerText: 'Generated on {currentDate}',
      styles: {
        headerBgColor: '#4e73df',
        headerTextColor: '#ffffff',
        rowBgColor: '#ffffff',
        rowAltBgColor: '#f8f9fc',
        rowTextColor: '#5a5c69',
        borderColor: '#e3e6f0',
        footerBgColor: '#f8f9fc',
        footerTextColor: '#5a5c69'
      }
    }
  },
  
  // Payroll Report Template
  {
    id: 'default-payroll',
    name: 'Standard Payroll Report',
    description: 'Shows payroll information with payment details by employee.',
    type: 'payroll',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      title: 'Payroll Report',
      subtitle: 'Payment details by employee',
      columns: [
        { key: 'period', title: 'Period', width: 15 },
        { key: 'employeeName', title: 'Employee Name', width: 25 },
        { key: 'employeeId', title: 'Employee ID', width: 15 },
        { key: 'totalHours', title: 'Hours Worked', format: 'number', width: 15, computeTotal: true, align: 'right' },
        { key: 'regularPay', title: 'Regular Pay', format: 'currency', width: 15, computeTotal: true, align: 'right' },
        { key: 'overtimePay', title: 'Overtime Pay', format: 'currency', width: 15, computeTotal: true, align: 'right' },
        { key: 'deductions', title: 'Deductions', format: 'currency', width: 15, computeTotal: true, align: 'right' },
        { key: 'netPay', title: 'Net Pay', format: 'currency', width: 15, computeTotal: true, align: 'right' },
        { key: 'status', title: 'Status', width: 15 },
      ],
      groupBy: 'period',
      sortBy: 'employeeName',
      sortDirection: 'asc',
      showTotals: true,
      pageSize: 'a4',
      orientation: 'landscape',
      headerLogo: true,
      footerText: 'Generated on {currentDate}',
      styles: {
        headerBgColor: '#4e73df',
        headerTextColor: '#ffffff',
        rowBgColor: '#ffffff',
        rowAltBgColor: '#f8f9fc',
        rowTextColor: '#5a5c69',
        borderColor: '#e3e6f0',
        footerBgColor: '#f8f9fc',
        footerTextColor: '#5a5c69'
      }
    }
  },
  
  // Employee Report Template
  {
    id: 'default-employee',
    name: 'Standard Employee Report',
    description: 'Lists all employees with their basic details and status.',
    type: 'employee',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      title: 'Employee Report',
      subtitle: 'Active employees list',
      columns: [
        { key: 'employeeId', title: 'Employee ID', width: 15 },
        { key: 'firstName', title: 'First Name', width: 20 },
        { key: 'lastName', title: 'Last Name', width: 20 },
        { key: 'designation', title: 'Designation', width: 20 },
        { key: 'dailyWage', title: 'Daily Wage', format: 'currency', width: 15, align: 'right' },
        { key: 'mobileNumber', title: 'Mobile Number', width: 15 },
        { key: 'joinDate', title: 'Join Date', format: 'date', width: 15 },
        { key: 'status', title: 'Status', width: 15 },
      ],
      sortBy: 'employeeId',
      sortDirection: 'asc',
      pageSize: 'a4',
      orientation: 'landscape',
      headerLogo: true,
      footerText: 'Generated on {currentDate}',
      styles: {
        headerBgColor: '#4e73df',
        headerTextColor: '#ffffff',
        rowBgColor: '#ffffff',
        rowAltBgColor: '#f8f9fc',
        rowTextColor: '#5a5c69',
        borderColor: '#e3e6f0',
        footerBgColor: '#f8f9fc',
        footerTextColor: '#5a5c69'
      }
    }
  },
  
  // Project Report Template
  {
    id: 'default-project',
    name: 'Standard Project Report',
    description: 'Shows project details including employees assigned, timelines, and costs.',
    type: 'project',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      title: 'Project Report',
      subtitle: 'Project details and statistics',
      columns: [
        { key: 'projectId', title: 'Project ID', width: 15 },
        { key: 'projectName', title: 'Project Name', width: 25 },
        { key: 'clientName', title: 'Client', width: 20 },
        { key: 'startDate', title: 'Start Date', format: 'date', width: 15 },
        { key: 'endDate', title: 'End Date', format: 'date', width: 15 },
        { key: 'status', title: 'Status', width: 10 },
        { key: 'employeeCount', title: 'Employees', width: 10, align: 'center' },
        { key: 'totalHours', title: 'Total Hours', format: 'number', width: 15, align: 'right', computeTotal: true },
        { key: 'totalCost', title: 'Total Cost', format: 'currency', width: 15, align: 'right', computeTotal: true },
      ],
      sortBy: 'startDate',
      sortDirection: 'desc',
      showTotals: true,
      pageSize: 'a4',
      orientation: 'landscape',
      headerLogo: true,
      footerText: 'Generated on {currentDate}',
      styles: {
        headerBgColor: '#4e73df',
        headerTextColor: '#ffffff',
        rowBgColor: '#ffffff',
        rowAltBgColor: '#f8f9fc',
        rowTextColor: '#5a5c69',
        borderColor: '#e3e6f0',
        footerBgColor: '#f8f9fc',
        footerTextColor: '#5a5c69'
      }
    }
  },
  
  // Expenditure Report Template
  {
    id: 'default-expenditure',
    name: 'Standard Expenditure Report',
    description: 'Lists all expenses with categorization and project allocation.',
    type: 'expenditure',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      title: 'Expenditure Report',
      subtitle: 'Expenses by category and project',
      columns: [
        { key: 'date', title: 'Date', format: 'date', width: 15 },
        { key: 'category', title: 'Category', width: 20 },
        { key: 'description', title: 'Description', width: 30 },
        { key: 'projectName', title: 'Project', width: 20 },
        { key: 'employeeName', title: 'Employee', width: 20 },
        { key: 'amount', title: 'Amount', format: 'currency', width: 15, align: 'right', computeTotal: true },
        { key: 'paymentMethod', title: 'Payment Method', width: 15 },
        { key: 'status', title: 'Status', width: 15 },
      ],
      groupBy: 'category',
      sortBy: 'date',
      sortDirection: 'desc',
      showTotals: true,
      pageSize: 'a4',
      orientation: 'landscape',
      headerLogo: true,
      footerText: 'Generated on {currentDate}',
      styles: {
        headerBgColor: '#4e73df',
        headerTextColor: '#ffffff',
        rowBgColor: '#ffffff',
        rowAltBgColor: '#f8f9fc',
        rowTextColor: '#5a5c69',
        borderColor: '#e3e6f0',
        footerBgColor: '#f8f9fc',
        footerTextColor: '#5a5c69'
      }
    }
  },
  
  // Income Report Template
  {
    id: 'default-income',
    name: 'Standard Income Report',
    description: 'Shows income details with source and project information.',
    type: 'income',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    config: {
      title: 'Income Report',
      subtitle: 'Income by source and project',
      columns: [
        { key: 'date', title: 'Date', format: 'date', width: 15 },
        { key: 'source', title: 'Source', width: 20 },
        { key: 'description', title: 'Description', width: 30 },
        { key: 'projectName', title: 'Project', width: 20 },
        { key: 'amount', title: 'Amount', format: 'currency', width: 15, align: 'right', computeTotal: true },
        { key: 'paymentMethod', title: 'Payment Method', width: 15 },
        { key: 'status', title: 'Status', width: 15 },
      ],
      groupBy: 'source',
      sortBy: 'date',
      sortDirection: 'desc',
      showTotals: true,
      pageSize: 'a4',
      orientation: 'landscape',
      headerLogo: true,
      footerText: 'Generated on {currentDate}',
      styles: {
        headerBgColor: '#4e73df',
        headerTextColor: '#ffffff',
        rowBgColor: '#ffffff',
        rowAltBgColor: '#f8f9fc',
        rowTextColor: '#5a5c69',
        borderColor: '#e3e6f0',
        footerBgColor: '#f8f9fc',
        footerTextColor: '#5a5c69'
      }
    }
  }
];

// Function to generate PDF content from template and data
export function generateReportData(template: ReportTemplate, data: any[]) {
  // Process the data based on template configuration
  let processedData = [...data];
  
  // Apply filters
  if (template.config.filters && template.config.filters.length > 0) {
    processedData = applyFilters(processedData, template.config.filters);
  }
  
  // Apply sorting
  if (template.config.sortBy) {
    processedData = applySorting(processedData, template.config.sortBy, template.config.sortDirection || 'asc');
  }
  
  // Apply grouping if specified
  const groupedData = template.config.groupBy 
    ? groupData(processedData, template.config.groupBy) 
    : { 'all': processedData };
  
  // Calculate totals if needed
  const totals = template.config.showTotals ? calculateTotals(processedData, template.config.columns) : null;
  
  // Calculate averages if needed
  const averages = template.config.showAverages ? calculateAverages(processedData, template.config.columns) : null;
  
  return {
    title: template.config.title,
    subtitle: template.config.subtitle,
    columns: template.config.columns.filter(col => col.visible !== false),
    groupedData,
    totals,
    averages,
    styles: template.config.styles,
    orientation: template.config.orientation || 'portrait',
    pageSize: template.config.pageSize || 'a4',
    headerLogo: template.config.headerLogo || false,
    footerText: processFooterText(template.config.footerText || ''),
    dateFormat: template.config.dateFormat || 'MM/DD/YYYY'
  };
}

// Helper function to apply filters to data
function applyFilters(data: any[], filters: ReportFilter[]) {
  return data.filter(item => {
    return filters.every(filter => {
      const value = item[filter.field];
      
      switch (filter.operator) {
        case 'equals':
          return value === filter.value;
        case 'notEquals':
          return value !== filter.value;
        case 'contains':
          return value && value.toString().toLowerCase().includes(filter.value.toString().toLowerCase());
        case 'greaterThan':
          return value > filter.value;
        case 'lessThan':
          return value < filter.value;
        case 'between':
          return value >= filter.value[0] && value <= filter.value[1];
        case 'in':
          return filter.value.includes(value);
        default:
          return true;
      }
    });
  });
}

// Helper function to apply sorting to data
function applySorting(data: any[], sortBy: string, sortDirection: 'asc' | 'desc') {
  return [...data].sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];
    
    if (valueA === valueB) return 0;
    
    const comparison = valueA < valueB ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });
}

// Helper function to group data
function groupData(data: any[], groupBy: string) {
  const result: { [key: string]: any[] } = {};
  
  data.forEach(item => {
    const groupValue = item[groupBy]?.toString() || 'Unknown';
    if (!result[groupValue]) {
      result[groupValue] = [];
    }
    result[groupValue].push(item);
  });
  
  return result;
}

// Helper function to calculate totals
function calculateTotals(data: any[], columns: ReportColumn[]) {
  const totals: { [key: string]: number } = {};
  
  columns.forEach(column => {
    if (column.computeTotal) {
      totals[column.key] = data.reduce((sum, item) => {
        const value = parseFloat(item[column.key]);
        return sum + (isNaN(value) ? 0 : value);
      }, 0);
    }
  });
  
  return totals;
}

// Helper function to calculate averages
function calculateAverages(data: any[], columns: ReportColumn[]) {
  const averages: { [key: string]: number } = {};
  const count = data.length;
  
  if (count === 0) return averages;
  
  columns.forEach(column => {
    if (column.computeTotal) {
      averages[column.key] = data.reduce((sum, item) => {
        const value = parseFloat(item[column.key]);
        return sum + (isNaN(value) ? 0 : value);
      }, 0) / count;
    }
  });
  
  return averages;
}

// Helper function to process footer text
function processFooterText(footerText: string) {
  // Replace placeholders with actual values
  return footerText.replace('{currentDate}', new Date().toLocaleDateString());
}

// Additional helper functions for report generation
export const ReportHelpers = {
  formatValue(value: any, format: string | undefined, dateFormat?: string) {
    if (value === null || value === undefined) return '';
    
    switch (format) {
      case 'date':
        return formatDate(value, dateFormat);
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return formatNumber(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return value.toString();
    }
  },
  
  formatDate(value: any, format?: string) {
    return formatDate(value, format);
  },
  
  formatCurrency(value: any) {
    return formatCurrency(value);
  },
  
  formatNumber(value: any) {
    return formatNumber(value);
  },
  
  formatPercentage(value: any) {
    return formatPercentage(value);
  }
};

// Formatter functions
function formatDate(value: any, format?: string) {
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    
    // Simple date formatting without dependencies
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    if (format?.includes('HH')) {
      return `${month}/${day}/${year} ${hours}:${minutes}`;
    }
    
    return `${month}/${day}/${year}`;
  } catch (e) {
    return '';
  }
}

function formatCurrency(value: any) {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  } catch (e) {
    return '';
  }
}

function formatNumber(value: any) {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  } catch (e) {
    return '';
  }
}

function formatPercentage(value: any) {
  try {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num / 100);
  } catch (e) {
    return '';
  }
}