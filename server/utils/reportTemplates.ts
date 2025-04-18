import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { 
  Employee, Project, Attendance, Payroll,
  DailyExpenditure as Expenditure, DailyIncome as Income
} from '@shared/schema';

// Types for report templates
export interface ColumnConfig {
  key: string;
  title: string;
  format?: 'text' | 'number' | 'date' | 'currency' | 'percentage';
  align?: 'left' | 'center' | 'right';
  width?: number;
  visible?: boolean;
  computeTotal?: boolean;
}

export interface ReportConfig {
  columns: ColumnConfig[];
  filters: string[];
  showTotals: boolean;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
  pageMargin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  fontFamily?: string;
  headerImageUrl?: string;
  footerText?: string;
  includeDateRange?: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'attendance' | 'payroll' | 'employee' | 'project' | 'expenditure' | 'income';
  config: ReportConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// Utility functions for report templates
const getTemplatesDir = (): string => {
  const templatesDir = path.join(process.cwd(), 'uploads', 'report-templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }
  return templatesDir;
};

// Default templates for each report type
const defaultTemplates: { [key: string]: ReportTemplate } = {
  attendance: {
    id: 'attendance-default',
    name: 'Default Attendance Report',
    description: 'Standard attendance report showing employee attendance records',
    type: 'attendance',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      columns: [
        { key: 'date', title: 'Date', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'employeeName', title: 'Employee Name', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'checkIn', title: 'Check In', format: 'text', align: 'center', width: 100, visible: true },
        { key: 'checkOut', title: 'Check Out', format: 'text', align: 'center', width: 100, visible: true },
        { key: 'hoursWorked', title: 'Hours', format: 'number', align: 'center', width: 80, visible: true, computeTotal: true },
        { key: 'projectName', title: 'Project', format: 'text', align: 'left', width: 120, visible: true },
        { key: 'status', title: 'Status', format: 'text', align: 'center', width: 100, visible: true },
        { key: 'remarks', title: 'Remarks', format: 'text', align: 'left', width: 200, visible: true }
      ],
      filters: ['dateRange', 'employee', 'project', 'status'],
      showTotals: true,
      orientation: 'landscape',
      pageSize: 'A4',
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: 'Arial',
      includeDateRange: true
    }
  },
  payroll: {
    id: 'payroll-default',
    name: 'Default Payroll Report',
    description: 'Standard payroll report showing employee salary details',
    type: 'payroll',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      columns: [
        { key: 'employeeName', title: 'Employee Name', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'periodStart', title: 'Period Start', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'periodEnd', title: 'Period End', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'basicSalary', title: 'Basic Salary', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'allowances', title: 'Allowances', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'deductions', title: 'Deductions', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'tax', title: 'Tax', format: 'currency', align: 'right', width: 100, visible: true, computeTotal: true },
        { key: 'netSalary', title: 'Net Salary', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'status', title: 'Status', format: 'text', align: 'center', width: 100, visible: true },
        { key: 'paymentDate', title: 'Payment Date', format: 'date', align: 'center', width: 100, visible: true }
      ],
      filters: ['dateRange', 'employee', 'status'],
      showTotals: true,
      orientation: 'landscape',
      pageSize: 'A4',
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: 'Arial',
      includeDateRange: true
    }
  },
  employee: {
    id: 'employee-default',
    name: 'Employee Directory',
    description: 'Standard employee directory report',
    type: 'employee',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      columns: [
        { key: 'employeeId', title: 'ID', format: 'text', align: 'center', width: 80, visible: true },
        { key: 'fullName', title: 'Name', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'designation', title: 'Designation', format: 'text', align: 'left', width: 120, visible: true },
        { key: 'phone', title: 'Phone', format: 'text', align: 'left', width: 120, visible: true },
        { key: 'email', title: 'Email', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'dailyWage', title: 'Daily Wage', format: 'currency', align: 'right', width: 120, visible: true },
        { key: 'joinDate', title: 'Join Date', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'status', title: 'Status', format: 'text', align: 'center', width: 100, visible: true }
      ],
      filters: ['designation', 'status'],
      showTotals: false,
      orientation: 'landscape',
      pageSize: 'A4',
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: 'Arial',
      includeDateRange: false
    }
  },
  project: {
    id: 'project-default',
    name: 'Project List',
    description: 'Standard project listing report',
    type: 'project',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      columns: [
        { key: 'name', title: 'Project Name', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'clientName', title: 'Client', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'startDate', title: 'Start Date', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'endDate', title: 'End Date', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'status', title: 'Status', format: 'text', align: 'center', width: 100, visible: true },
        { key: 'budget', title: 'Budget', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'description', title: 'Description', format: 'text', align: 'left', width: 200, visible: true }
      ],
      filters: ['status', 'clientName'],
      showTotals: true,
      orientation: 'landscape',
      pageSize: 'A4',
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: 'Arial',
      includeDateRange: false
    }
  },
  expenditure: {
    id: 'expenditure-default',
    name: 'Expenditure Report',
    description: 'Standard expenditure listing report',
    type: 'expenditure',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      columns: [
        { key: 'date', title: 'Date', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'amount', title: 'Amount', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'category', title: 'Category', format: 'text', align: 'left', width: 120, visible: true },
        { key: 'description', title: 'Description', format: 'text', align: 'left', width: 200, visible: true },
        { key: 'employeeName', title: 'Employee', format: 'text', align: 'left', width: 150, visible: true },
        { key: 'projectName', title: 'Project', format: 'text', align: 'left', width: 150, visible: true }
      ],
      filters: ['dateRange', 'category', 'employee', 'project'],
      showTotals: true,
      orientation: 'landscape',
      pageSize: 'A4',
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: 'Arial',
      includeDateRange: true
    }
  },
  income: {
    id: 'income-default',
    name: 'Income Report',
    description: 'Standard income listing report',
    type: 'income',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      columns: [
        { key: 'date', title: 'Date', format: 'date', align: 'center', width: 100, visible: true },
        { key: 'amount', title: 'Amount', format: 'currency', align: 'right', width: 120, visible: true, computeTotal: true },
        { key: 'category', title: 'Category', format: 'text', align: 'left', width: 120, visible: true },
        { key: 'description', title: 'Description', format: 'text', align: 'left', width: 200, visible: true },
        { key: 'projectName', title: 'Project', format: 'text', align: 'left', width: 150, visible: true }
      ],
      filters: ['dateRange', 'category', 'project'],
      showTotals: true,
      orientation: 'landscape',
      pageSize: 'A4',
      pageMargin: { top: 20, right: 20, bottom: 20, left: 20 },
      fontSize: 10,
      fontFamily: 'Arial',
      includeDateRange: true
    }
  }
};

// Template operations
export const listReportTemplates = async (): Promise<ReportTemplate[]> => {
  try {
    const templatesDir = getTemplatesDir();
    const readdir = promisify(fs.readdir);
    const readFile = promisify(fs.readFile);
    
    // Get all template files
    const files = await readdir(templatesDir);
    const templateFiles = files.filter(f => f.endsWith('.json'));
    
    // Read template data from files
    const templates: ReportTemplate[] = [];
    for (const file of templateFiles) {
      try {
        const data = await readFile(path.join(templatesDir, file), 'utf8');
        const template = JSON.parse(data) as ReportTemplate;
        templates.push(template);
      } catch (err) {
        console.error(`Error reading template file ${file}:`, err);
      }
    }
    
    // Add default templates if not already present
    for (const [type, defaultTemplate] of Object.entries(defaultTemplates)) {
      const exists = templates.some(t => t.id === defaultTemplate.id);
      if (!exists) {
        templates.push(defaultTemplate);
        // Also save the default template to disk
        await saveReportTemplate(defaultTemplate);
      }
    }
    
    // Sort templates by type and name
    return templates.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Error listing report templates:', error);
    // Return only default templates on error
    return Object.values(defaultTemplates);
  }
};

export const loadReportTemplate = async (id: string): Promise<ReportTemplate | null> => {
  try {
    const templatesDir = getTemplatesDir();
    const filePath = path.join(templatesDir, `${id}.json`);
    
    // Check if template file exists
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data) as ReportTemplate;
    }
    
    // Check if it's a default template
    for (const defaultTemplate of Object.values(defaultTemplates)) {
      if (defaultTemplate.id === id) {
        return defaultTemplate;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading report template ${id}:`, error);
    return null;
  }
};

export const saveReportTemplate = async (template: ReportTemplate): Promise<ReportTemplate> => {
  try {
    const templatesDir = getTemplatesDir();
    
    // Generate ID if not provided
    if (!template.id) {
      template.id = uuidv4();
      template.createdAt = new Date().toISOString();
    }
    
    // Update timestamps
    template.updatedAt = new Date().toISOString();
    
    // Save template to file
    const filePath = path.join(templatesDir, `${template.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2));
    
    return template;
  } catch (error) {
    console.error('Error saving report template:', error);
    throw error;
  }
};

export const deleteReportTemplate = async (id: string): Promise<boolean> => {
  try {
    // Don't allow deletion of default templates
    for (const defaultTemplate of Object.values(defaultTemplates)) {
      if (defaultTemplate.id === id) {
        return false;
      }
    }
    
    const templatesDir = getTemplatesDir();
    const filePath = path.join(templatesDir, `${id}.json`);
    
    // Check if template exists
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    // Delete template file
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting report template ${id}:`, error);
    return false;
  }
};

// Generate report data based on template and filters
export const generateReportData = async (
  templateId: string,
  dataType: string,
  filters: any = {}
): Promise<{
  template: ReportTemplate;
  companyDetails: any;
  data: any[];
  totals: Record<string, number>;
}> => {
  // Load template
  const template = await loadReportTemplate(templateId);
  if (!template) {
    throw new Error(`Report template ${templateId} not found`);
  }
  
  // Get company details
  const companyDetails = await storage.getCompanyDetails();
  
  // Get data based on type
  let data: any[] = [];
  switch (dataType) {
    case 'attendance':
      data = await storage.getAttendanceRecords(filters);
      break;
    case 'payroll':
      data = await storage.getPayrollRecords(filters);
      break;
    case 'employee':
      data = await storage.getEmployees(filters);
      break;
    case 'project':
      data = await storage.getProjects(filters);
      break;
    case 'expenditure':
      data = await storage.getExpenditures(filters);
      break;
    case 'income':
      data = await storage.getIncomes(filters);
      break;
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
  
  // Calculate totals for columns that have computeTotal enabled
  const totals: Record<string, number> = {};
  if (template.config.showTotals) {
    template.config.columns.forEach(column => {
      if (column.computeTotal && ['number', 'currency'].includes(column.format || '')) {
        const total = data.reduce((sum, item) => {
          const value = parseFloat(item[column.key]) || 0;
          return sum + value;
        }, 0);
        totals[column.key] = total;
      }
    });
  }
  
  return {
    template,
    companyDetails,
    data,
    totals
  };
};

// Format report data as HTML
export const formatReportAsHTML = (reportData: any): string => {
  const { template, companyDetails, data, totals } = reportData;
  const columns = template.config.columns.filter(col => col.visible);
  
  // Basic HTML template
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  <style>
    body {
      font-family: ${template.config.fontFamily || 'Arial, sans-serif'};
      font-size: ${template.config.fontSize || 10}pt;
      margin: 0;
      padding: 0;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 10px 0;
      border-bottom: 1px solid #ddd;
    }
    .company-details {
      flex: 1;
    }
    .report-info {
      text-align: right;
    }
    .report-title {
      font-size: 16pt;
      font-weight: bold;
      margin: 5px 0;
    }
    .report-description {
      color: #666;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #ddd;
      padding-top: 10px;
      font-size: 9pt;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    .totals-row td {
      font-weight: bold;
      border-top: 2px solid #000;
    }
    @media print {
      body {
        padding: 20mm;
      }
      @page {
        size: ${template.config.pageSize} ${template.config.orientation};
        margin: ${template.config.pageMargin?.top || 20}mm ${template.config.pageMargin?.right || 20}mm ${template.config.pageMargin?.bottom || 20}mm ${template.config.pageMargin?.left || 20}mm;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="company-details">
      <h1>${companyDetails.companyName}</h1>
      <div>${companyDetails.companyAddress}</div>
      <div>Phone: ${companyDetails.companyPhone} | Email: ${companyDetails.companyEmail}</div>
    </div>
    <div class="report-info">
      <div class="report-title">${template.name}</div>
      <div class="report-description">${template.description}</div>
      <div>Generated: ${new Date().toLocaleString()}</div>
      ${template.config.includeDateRange && filters?.dateFrom && filters?.dateTo ? 
        `<div>Period: ${new Date(filters.dateFrom).toLocaleDateString()} - ${new Date(filters.dateTo).toLocaleDateString()}</div>` : ''}
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        ${columns.map(col => `<th style="width: ${col.width}px; text-align: ${col.align || 'left'}">${col.title}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.length === 0 ? '<tr><td colspan="' + columns.length + '" class="text-center">No data available</td></tr>' : ''}
      ${data.map(row => `
        <tr>
          ${columns.map(col => {
            let value = row[col.key];
            let align = col.align || 'left';
            
            // Format the value based on column format
            if (col.format === 'date' && value) {
              value = new Date(value).toLocaleDateString();
            } else if (col.format === 'currency' && value != null) {
              value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
              align = 'right';
            } else if (col.format === 'number' && value != null) {
              value = new Intl.NumberFormat('en-US').format(value);
              align = 'right';
            } else if (col.format === 'percentage' && value != null) {
              value = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);
              align = 'right';
            }
            
            return `<td style="text-align: ${align}">${value ?? ''}</td>`;
          }).join('')}
        </tr>
      `).join('')}
      
      ${template.config.showTotals && Object.keys(totals).length > 0 ? `
        <tr class="totals-row">
          ${columns.map(col => {
            if (totals[col.key] !== undefined) {
              let value = totals[col.key];
              if (col.format === 'currency') {
                value = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
              } else if (col.format === 'number') {
                value = new Intl.NumberFormat('en-US').format(value);
              }
              return `<td style="text-align: ${col.align || 'right'}">${value}</td>`;
            } else {
              return col.key === columns[0].key ? '<td>Total</td>' : '<td></td>';
            }
          }).join('')}
        </tr>
      ` : ''}
    </tbody>
  </table>
  
  <div class="footer">
    <div>${template.config.footerText || ''}</div>
    <div>Page 1 of 1 | Generated by ${companyDetails.generatedBy}</div>
  </div>
</body>
</html>
  `;
  
  return html;
};

// Formatter for other output formats like PDF, Excel, etc.
export const formatReportAsPDF = async (reportData: any): Promise<Buffer> => {
  // For now, just convert the HTML to a buffer
  // In a real implementation, you would use a library like puppeteer to convert HTML to PDF
  const html = formatReportAsHTML(reportData);
  return Buffer.from(html);
};