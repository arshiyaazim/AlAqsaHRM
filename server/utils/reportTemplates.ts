import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { storage } from '../storage';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const unlink = promisify(fs.unlink);

// Define template directory
const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'report-templates');

// Ensure template directory exists
async function ensureTemplateDir() {
  try {
    await access(TEMPLATES_DIR);
  } catch (error) {
    // Directory doesn't exist, create it
    await mkdir(TEMPLATES_DIR, { recursive: true });
  }
}

// Interfaces for report templates
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

// Default templates for different report types
const attendanceTemplate: ReportTemplate = {
  id: 'default-attendance',
  name: 'Default Attendance Report',
  description: 'Standard attendance report showing employee check-in/out times',
  type: 'attendance',
  config: {
    columns: [
      { key: 'date', title: 'Date', format: 'date', width: 100 },
      { key: 'employeeId', title: 'Employee ID', format: 'text', width: 120 },
      { key: 'employeeName', title: 'Employee Name', format: 'text', width: 200 },
      { key: 'checkIn', title: 'Check In', format: 'text', width: 100 },
      { key: 'checkOut', title: 'Check Out', format: 'text', width: 100 },
      { key: 'hoursWorked', title: 'Hours', format: 'number', width: 80, computeTotal: true },
      { key: 'projectName', title: 'Project', format: 'text', width: 150 },
      { key: 'location', title: 'Location', format: 'text', width: 200 }
    ],
    filters: ['dateRange', 'employeeId', 'projectId'],
    showTotals: true,
    orientation: 'landscape',
    pageSize: 'A4',
    fontSize: 12,
    includeDateRange: true
  },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const payrollTemplate: ReportTemplate = {
  id: 'default-payroll',
  name: 'Default Payroll Report',
  description: 'Standard payroll report with salary breakdown',
  type: 'payroll',
  config: {
    columns: [
      { key: 'periodStart', title: 'Period Start', format: 'date', width: 100 },
      { key: 'periodEnd', title: 'Period End', format: 'date', width: 100 },
      { key: 'employeeId', title: 'Employee ID', format: 'text', width: 120 },
      { key: 'employeeName', title: 'Employee Name', format: 'text', width: 200 },
      { key: 'basicSalary', title: 'Basic Salary', format: 'currency', width: 120, computeTotal: true },
      { key: 'allowances', title: 'Allowances', format: 'currency', width: 120, computeTotal: true },
      { key: 'deductions', title: 'Deductions', format: 'currency', width: 120, computeTotal: true },
      { key: 'tax', title: 'Tax', format: 'currency', width: 100, computeTotal: true },
      { key: 'netSalary', title: 'Net Salary', format: 'currency', width: 120, computeTotal: true },
      { key: 'paymentStatus', title: 'Status', format: 'text', width: 100 }
    ],
    filters: ['dateRange', 'employeeId', 'paymentStatus'],
    showTotals: true,
    orientation: 'landscape',
    pageSize: 'A4',
    fontSize: 12,
    includeDateRange: true
  },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const employeeTemplate: ReportTemplate = {
  id: 'default-employee',
  name: 'Employee Directory',
  description: 'Complete employee directory with personal and employment details',
  type: 'employee',
  config: {
    columns: [
      { key: 'employeeId', title: 'Employee ID', format: 'text', width: 120 },
      { key: 'firstName', title: 'First Name', format: 'text', width: 150 },
      { key: 'lastName', title: 'Last Name', format: 'text', width: 150 },
      { key: 'designation', title: 'Designation', format: 'text', width: 150 },
      { key: 'dailyWage', title: 'Daily Wage', format: 'currency', width: 120 },
      { key: 'mobileNumber', title: 'Mobile', format: 'text', width: 120 },
      { key: 'joinDate', title: 'Join Date', format: 'date', width: 120 },
      { key: 'isActive', title: 'Status', format: 'text', width: 100 }
    ],
    filters: ['designation', 'isActive'],
    showTotals: false,
    orientation: 'landscape',
    pageSize: 'A4',
    fontSize: 12,
    includeDateRange: false
  },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const projectTemplate: ReportTemplate = {
  id: 'default-project',
  name: 'Project Summary',
  description: 'Overview of all projects with key details',
  type: 'project',
  config: {
    columns: [
      { key: 'name', title: 'Project Name', format: 'text', width: 200 },
      { key: 'clientName', title: 'Client', format: 'text', width: 150 },
      { key: 'vessel', title: 'Vessel', format: 'text', width: 150 },
      { key: 'startDate', title: 'Start Date', format: 'date', width: 120 },
      { key: 'endDate', title: 'End Date', format: 'date', width: 120 },
      { key: 'status', title: 'Status', format: 'text', width: 100 },
      { key: 'employeeCount', title: 'Employees', format: 'number', width: 100 },
      { key: 'totalExpenditure', title: 'Expenditure', format: 'currency', width: 150, computeTotal: true }
    ],
    filters: ['status', 'clientName'],
    showTotals: true,
    orientation: 'landscape',
    pageSize: 'A4',
    fontSize: 12,
    includeDateRange: false
  },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const expenditureTemplate: ReportTemplate = {
  id: 'default-expenditure',
  name: 'Expenditure Report',
  description: 'Detailed breakdown of all expenses',
  type: 'expenditure',
  config: {
    columns: [
      { key: 'date', title: 'Date', format: 'date', width: 100 },
      { key: 'projectName', title: 'Project', format: 'text', width: 200 },
      { key: 'category', title: 'Category', format: 'text', width: 150 },
      { key: 'description', title: 'Description', format: 'text', width: 200 },
      { key: 'amount', title: 'Amount', format: 'currency', width: 120, computeTotal: true },
      { key: 'paymentMethod', title: 'Payment Method', format: 'text', width: 150 },
      { key: 'recordedBy', title: 'Recorded By', format: 'text', width: 150 }
    ],
    filters: ['dateRange', 'projectId', 'category'],
    showTotals: true,
    orientation: 'landscape',
    pageSize: 'A4',
    fontSize: 12,
    includeDateRange: true
  },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const incomeTemplate: ReportTemplate = {
  id: 'default-income',
  name: 'Income Report',
  description: 'Detailed breakdown of all income sources',
  type: 'income',
  config: {
    columns: [
      { key: 'date', title: 'Date', format: 'date', width: 100 },
      { key: 'projectName', title: 'Project', format: 'text', width: 200 },
      { key: 'source', title: 'Source', format: 'text', width: 150 },
      { key: 'description', title: 'Description', format: 'text', width: 200 },
      { key: 'amount', title: 'Amount', format: 'currency', width: 120, computeTotal: true },
      { key: 'paymentMethod', title: 'Payment Method', format: 'text', width: 150 },
      { key: 'recordedBy', title: 'Recorded By', format: 'text', width: 150 }
    ],
    filters: ['dateRange', 'projectId', 'source'],
    showTotals: true,
    orientation: 'landscape',
    pageSize: 'A4',
    fontSize: 12,
    includeDateRange: true
  },
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// All default templates
export const defaultTemplates = [
  attendanceTemplate,
  payrollTemplate,
  employeeTemplate,
  projectTemplate,
  expenditureTemplate,
  incomeTemplate
];

// List all report templates
export const listReportTemplates = async (): Promise<ReportTemplate[]> => {
  await ensureTemplateDir();
  
  // First, get all custom templates
  const templates: ReportTemplate[] = [];
  
  try {
    const files = fs.readdirSync(TEMPLATES_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await readFile(path.join(TEMPLATES_DIR, file), 'utf8');
          const template = JSON.parse(content) as ReportTemplate;
          templates.push(template);
        } catch (err) {
          console.error(`Error reading template file ${file}:`, err);
        }
      }
    }
  } catch (err) {
    console.error('Error reading templates directory:', err);
  }
  
  // Add default templates that don't have a custom override
  for (const defaultTemplate of defaultTemplates) {
    if (!templates.some(t => t.id === defaultTemplate.id)) {
      templates.push(defaultTemplate);
    }
  }
  
  return templates;
};

// Load a specific report template
export const loadReportTemplate = async (id: string): Promise<ReportTemplate | null> => {
  await ensureTemplateDir();
  
  // First check if it's a custom template
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  
  try {
    await access(filePath);
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as ReportTemplate;
  } catch (err) {
    // If not found as a file, check if it's a default template
    const defaultTemplate = defaultTemplates.find(t => t.id === id);
    return defaultTemplate || null;
  }
};

// Save a report template
export const saveReportTemplate = async (template: ReportTemplate): Promise<ReportTemplate> => {
  await ensureTemplateDir();
  
  // Don't allow overriding default templates with isDefault=true
  const existingTemplate = await loadReportTemplate(template.id);
  
  if (existingTemplate?.isDefault && existingTemplate.id.startsWith('default-')) {
    // If trying to save a default template, create a copy instead
    template.id = `custom-${template.type}-${Date.now()}`;
    template.isDefault = false;
    template.updatedAt = new Date().toISOString();
    
    if (!template.createdAt) {
      template.createdAt = new Date().toISOString();
    }
  }
  
  // Save the template to file
  const filePath = path.join(TEMPLATES_DIR, `${template.id}.json`);
  await writeFile(filePath, JSON.stringify(template, null, 2), 'utf8');
  
  return template;
};

// Delete a report template
export const deleteReportTemplate = async (id: string): Promise<boolean> => {
  await ensureTemplateDir();
  
  // Don't allow deleting default templates
  const defaultTemplate = defaultTemplates.find(t => t.id === id);
  if (defaultTemplate) {
    return false;
  }
  
  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
  
  try {
    await access(filePath);
    await unlink(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

// Generate report data based on template and filters
export const generateReportData = async (
  templateId: string,
  dataType: string, 
  filters: any = {}
): Promise<any> => {
  // Load template
  const template = await loadReportTemplate(templateId);
  
  if (!template) {
    throw new Error(`Report template not found: ${templateId}`);
  }
  
  // Get company details
  const companyDetails = await storage.getCompanyDetails();
  
  // Get data based on template type
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
    template.config.columns
      .filter(col => col.computeTotal && ['number', 'currency'].includes(col.format || ''))
      .forEach(col => {
        const total = data.reduce((sum, item) => {
          const value = parseFloat(item[col.key]) || 0;
          return sum + value;
        }, 0);
        totals[col.key] = total;
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
  
  // Basic HTML template
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${template.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .report-header { text-align: center; margin-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; }
        .report-title { font-size: 20px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals-row { font-weight: bold; background-color: #f9f9f9; }
        .report-footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="report-header">
        ${companyDetails.logoUrl ? `<img src="${companyDetails.logoUrl}" alt="Company Logo" style="max-height: 80px;">` : ''}
        <div class="company-name">${companyDetails.companyName}</div>
        ${companyDetails.companyTagline ? `<div>${companyDetails.companyTagline}</div>` : ''}
        <div class="report-title">${template.name}</div>
        <div>${new Date().toLocaleDateString()}</div>
      </div>
      
      <table>
        <thead>
          <tr>
            ${template.config.columns
              .filter(col => col.visible !== false)
              .map(col => `<th>${col.title}</th>`)
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${template.config.columns
                .filter(col => col.visible !== false)
                .map(col => {
                  let value = row[col.key];
                  
                  // Format value based on column type
                  if (col.format === 'date' && value) {
                    value = new Date(value).toLocaleDateString();
                  } else if (col.format === 'currency' && value !== undefined) {
                    value = `$${parseFloat(value).toFixed(2)}`;
                  } else if (col.format === 'number' && value !== undefined) {
                    value = parseFloat(value).toFixed(2);
                  } else if (col.format === 'percentage' && value !== undefined) {
                    value = `${parseFloat(value).toFixed(2)}%`;
                  }
                  
                  const align = col.align || 
                    (col.format === 'number' || col.format === 'currency' || col.format === 'percentage' 
                      ? 'right' : 'left');
                  
                  return `<td class="text-${align}">${value !== undefined ? value : ''}</td>`;
                })
                .join('')}
            </tr>
          `).join('')}
          
          ${template.config.showTotals ? `
            <tr class="totals-row">
              ${template.config.columns
                .filter(col => col.visible !== false)
                .map(col => {
                  if (col.computeTotal && totals[col.key] !== undefined) {
                    let formattedTotal = totals[col.key];
                    
                    if (col.format === 'currency') {
                      formattedTotal = `$${formattedTotal.toFixed(2)}`;
                    } else if (col.format === 'number') {
                      formattedTotal = formattedTotal.toFixed(2);
                    } else if (col.format === 'percentage') {
                      formattedTotal = `${formattedTotal.toFixed(2)}%`;
                    }
                    
                    return `<td class="text-right">${formattedTotal}</td>`;
                  } else {
                    return `<td></td>`;
                  }
                })
                .join('')}
            </tr>
          ` : ''}
        </tbody>
      </table>
      
      <div class="report-footer">
        ${template.config.footerText || 'Generated report - ' + new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;
  
  return html;
};

// Format report data as PDF
export const formatReportAsPDF = async (reportData: any): Promise<Buffer> => {
  // For PDF generation, we would typically use a library like puppeteer or html-pdf
  // For this example, we'll just return the HTML content as a buffer
  const html = formatReportAsHTML(reportData);
  
  // In a real implementation, convert HTML to PDF here
  // For now, just return the HTML as a buffer
  return Buffer.from(html);
};