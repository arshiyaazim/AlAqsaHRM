/**
 * Report Generator
 * 
 * Utility to generate HTML and PDF reports from templates and data
 */

import { ReportTemplate, ReportHelpers, generateReportData } from './reportTemplates';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Generate HTML for a report based on template and data
 */
export async function generateReportHtml(
  template: ReportTemplate,
  data: any[],
  companyDetails: any
) {
  // Process data based on template
  const reportData = generateReportData(template, data);
  
  // Load base HTML template
  let html = '';
  try {
    html = await readFileAsync(path.resolve(__dirname, '../../templates/report_template.html'), 'utf8');
  } catch (err) {
    // If template doesn't exist, use default HTML template
    html = getDefaultHtmlTemplate();
  }
  
  // Replace placeholders with actual content
  html = html
    .replace('{{REPORT_TITLE}}', reportData.title)
    .replace('{{REPORT_SUBTITLE}}', reportData.subtitle || '')
    .replace('{{COMPANY_NAME}}', companyDetails?.companyName || 'Al-Aqsa Security')
    .replace('{{COMPANY_ADDRESS}}', companyDetails?.address || '')
    .replace('{{COMPANY_CONTACT}}', companyDetails?.contactInfo || '')
    .replace('{{REPORT_DATE}}', new Date().toLocaleDateString())
    .replace('{{REPORT_TABLE}}', generateReportTable(reportData))
    .replace('{{REPORT_STYLE}}', generateReportStyles(reportData.styles))
    .replace('{{FOOTER_TEXT}}', reportData.footerText);
    
  if (reportData.headerLogo && companyDetails?.logoUrl) {
    html = html.replace('{{COMPANY_LOGO}}', `<img src="${companyDetails.logoUrl}" alt="Company Logo" class="report-logo">`);
  } else {
    html = html.replace('{{COMPANY_LOGO}}', '');
  }
    
  return html;
}

/**
 * Generate an Excel file for a report based on template and data
 */
export async function generateReportExcel(
  template: ReportTemplate,
  data: any[],
  filePath: string
) {
  // This would use a library like xlsx to generate Excel files
  // For this implementation, we'll need to install xlsx package
  
  // Here we are just setting up the structure that would be used with the xlsx library
  const reportData = generateReportData(template, data);
  const headers = reportData.columns.map(col => col.title);
  
  const excelData = [headers];
  
  // Add data rows
  Object.keys(reportData.groupedData).forEach(groupKey => {
    const groupData = reportData.groupedData[groupKey];
    
    if (template.config.groupBy && groupKey !== 'all') {
      // Add group header row if grouping is used
      excelData.push([`${template.config.groupBy}: ${groupKey}`]);
    }
    
    // Add data rows
    groupData.forEach(row => {
      const rowData = reportData.columns.map(col => {
        const value = row[col.key];
        return ReportHelpers.formatValue(value, col.format, reportData.dateFormat);
      });
      
      excelData.push(rowData);
    });
    
    // Add blank row between groups if there are multiple groups
    if (Object.keys(reportData.groupedData).length > 1) {
      excelData.push([]);
    }
  });
  
  // Add totals row if needed
  if (reportData.totals) {
    const totalsRow = reportData.columns.map(col => {
      if (col.computeTotal) {
        return ReportHelpers.formatValue(reportData.totals?.[col.key], col.format);
      }
      return col.key === reportData.columns[0].key ? 'Total' : '';
    });
    
    excelData.push([]);
    excelData.push(totalsRow);
  }
  
  // In a real implementation, we would use code like this:
  // const workbook = XLSX.utils.book_new();
  // const worksheet = XLSX.utils.aoa_to_sheet(excelData);
  // XLSX.utils.book_append_sheet(workbook, worksheet, template.name);
  // XLSX.writeFile(workbook, filePath);
  
  // For now, we'll just return a message since we're not implementing the full Excel export yet
  return { 
    success: true, 
    message: 'Excel report structure prepared, would save to: ' + filePath 
  };
}

/**
 * Get a default HTML template for reports
 */
function getDefaultHtmlTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{REPORT_TITLE}}</title>
  <style>
    {{REPORT_STYLE}}
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <div class="company-info">
        <h1 class="company-name">{{COMPANY_NAME}}</h1>
        <p class="company-address">{{COMPANY_ADDRESS}}</p>
        <p class="company-contact">{{COMPANY_CONTACT}}</p>
      </div>
      <div class="logo-container">
        {{COMPANY_LOGO}}
      </div>
    </div>
    
    <div class="report-title-section">
      <h2 class="report-title">{{REPORT_TITLE}}</h2>
      <p class="report-subtitle">{{REPORT_SUBTITLE}}</p>
      <p class="report-date">Generated on {{REPORT_DATE}}</p>
    </div>
    
    <div class="report-content">
      {{REPORT_TABLE}}
    </div>
    
    <div class="report-footer">
      <p>{{FOOTER_TEXT}}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML table for the report
 */
function generateReportTable(reportData: any) {
  // Start with table headers
  let tableHtml = '<table class="report-table">\n<thead>\n<tr>\n';
  
  // Add header cells
  reportData.columns.forEach((column: any) => {
    const alignClass = column.align ? ` class="align-${column.align}"` : '';
    tableHtml += `<th${alignClass}>${column.title}</th>\n`;
  });
  
  tableHtml += '</tr>\n</thead>\n<tbody>\n';
  
  // Add data rows by group
  Object.keys(reportData.groupedData).forEach((groupKey, groupIndex) => {
    const groupData = reportData.groupedData[groupKey];
    
    // Add group header if grouping is used
    if (reportData.config?.groupBy && groupKey !== 'all') {
      tableHtml += `<tr class="group-header">\n<td colspan="${reportData.columns.length}">${reportData.config.groupBy}: ${groupKey}</td>\n</tr>\n`;
    }
    
    // Add data rows
    groupData.forEach((row: any, rowIndex: number) => {
      const rowClass = rowIndex % 2 === 0 ? 'even-row' : 'odd-row';
      tableHtml += `<tr class="${rowClass}">\n`;
      
      reportData.columns.forEach((column: any) => {
        const value = row[column.key];
        const formattedValue = ReportHelpers.formatValue(value, column.format, reportData.dateFormat);
        const alignClass = column.align ? ` class="align-${column.align}"` : '';
        tableHtml += `<td${alignClass}>${formattedValue}</td>\n`;
      });
      
      tableHtml += '</tr>\n';
    });
    
    // Add a spacer row between groups if there are multiple groups
    if (Object.keys(reportData.groupedData).length > 1 && groupIndex < Object.keys(reportData.groupedData).length - 1) {
      tableHtml += `<tr class="group-spacer">\n<td colspan="${reportData.columns.length}"></td>\n</tr>\n`;
    }
  });
  
  // Add totals row if available
  if (reportData.totals) {
    tableHtml += `<tr class="totals-row">\n`;
    
    reportData.columns.forEach((column: any, index: number) => {
      const alignClass = column.align ? ` class="align-${column.align}"` : '';
      if (column.computeTotal) {
        const formattedValue = ReportHelpers.formatValue(reportData.totals[column.key], column.format);
        tableHtml += `<td${alignClass}>${formattedValue}</td>\n`;
      } else {
        tableHtml += `<td${alignClass}>${index === 0 ? 'Total' : ''}</td>\n`;
      }
    });
    
    tableHtml += '</tr>\n';
  }
  
  // Add averages row if available
  if (reportData.averages) {
    tableHtml += `<tr class="averages-row">\n`;
    
    reportData.columns.forEach((column: any, index: number) => {
      const alignClass = column.align ? ` class="align-${column.align}"` : '';
      if (column.computeTotal) {
        const formattedValue = ReportHelpers.formatValue(reportData.averages[column.key], column.format);
        tableHtml += `<td${alignClass}>${formattedValue}</td>\n`;
      } else {
        tableHtml += `<td${alignClass}>${index === 0 ? 'Average' : ''}</td>\n`;
      }
    });
    
    tableHtml += '</tr>\n';
  }
  
  tableHtml += '</tbody>\n</table>';
  
  return tableHtml;
}

/**
 * Generate CSS styles for the report
 */
function generateReportStyles(styles: any) {
  return `
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
    }
    
    .report-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      border-bottom: 1px solid ${styles?.borderColor || '#e3e6f0'};
      padding-bottom: 20px;
    }
    
    .company-name {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: ${styles?.headerTextColor || '#4e73df'};
    }
    
    .company-address, .company-contact {
      margin: 5px 0;
      font-size: 14px;
    }
    
    .report-logo {
      max-width: 150px;
      max-height: 80px;
    }
    
    .report-title-section {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .report-title {
      margin: 0 0 10px 0;
      color: ${styles?.headerTextColor || '#4e73df'};
    }
    
    .report-subtitle {
      margin: 0 0 15px 0;
      font-style: italic;
      color: #666;
    }
    
    .report-date {
      font-size: 14px;
      color: #666;
    }
    
    .report-content {
      margin-bottom: 30px;
    }
    
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .report-table th {
      background-color: ${styles?.headerBgColor || '#4e73df'};
      color: ${styles?.headerTextColor || '#ffffff'};
      padding: 10px;
      text-align: left;
      border: 1px solid ${styles?.borderColor || '#e3e6f0'};
    }
    
    .report-table td {
      padding: 8px 10px;
      border: 1px solid ${styles?.borderColor || '#e3e6f0'};
    }
    
    .report-table .even-row {
      background-color: ${styles?.rowBgColor || '#ffffff'};
    }
    
    .report-table .odd-row {
      background-color: ${styles?.rowAltBgColor || '#f8f9fc'};
    }
    
    .report-table .group-header {
      background-color: #f1f1f1;
      font-weight: bold;
    }
    
    .report-table .group-spacer td {
      height: 15px;
      border: none;
    }
    
    .report-table .totals-row {
      font-weight: bold;
      border-top: 2px solid ${styles?.borderColor || '#e3e6f0'};
      background-color: #f1f1f1;
    }
    
    .report-table .averages-row {
      font-style: italic;
      border-top: 1px solid ${styles?.borderColor || '#e3e6f0'};
      background-color: #f8f8f8;
    }
    
    .align-left {
      text-align: left;
    }
    
    .align-center {
      text-align: center;
    }
    
    .align-right {
      text-align: right;
    }
    
    .report-footer {
      margin-top: 30px;
      border-top: 1px solid ${styles?.borderColor || '#e3e6f0'};
      padding-top: 15px;
      text-align: center;
      color: ${styles?.footerTextColor || '#666'};
      font-size: 14px;
    }
    
    @media print {
      body {
        font-size: 12px;
      }
      
      .report-container {
        padding: 0;
        width: 100%;
      }
      
      .company-name {
        font-size: 18px;
      }
      
      .report-table th, .report-table td {
        padding: 5px 8px;
      }
    }
  `;
}

/**
 * Save report template to file
 */
export async function saveReportTemplate(template: ReportTemplate) {
  try {
    // Ensure the templates directory exists
    const templatesDir = path.resolve(__dirname, '../../data/report_templates');
    await mkdirAsync(templatesDir, { recursive: true });
    
    // Save the template to a file
    const filePath = path.resolve(templatesDir, `${template.id}.json`);
    await writeFileAsync(filePath, JSON.stringify(template, null, 2), 'utf8');
    
    return { success: true, filePath };
  } catch (err) {
    console.error('Error saving report template:', err);
    return { success: false, error: err };
  }
}

/**
 * Load report template from file
 */
export async function loadReportTemplate(templateId: string) {
  try {
    const filePath = path.resolve(__dirname, `../../data/report_templates/${templateId}.json`);
    const data = await readFileAsync(filePath, 'utf8');
    return { success: true, template: JSON.parse(data) };
  } catch (err) {
    console.error('Error loading report template:', err);
    return { success: false, error: err };
  }
}

/**
 * List all available report templates
 */
export async function listReportTemplates() {
  try {
    const templatesDir = path.resolve(__dirname, '../../data/report_templates');
    
    // Create the directory if it doesn't exist
    await mkdirAsync(templatesDir, { recursive: true });
    
    const files = await promisify(fs.readdir)(templatesDir);
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.resolve(templatesDir, file);
        const data = await readFileAsync(filePath, 'utf8');
        templates.push(JSON.parse(data));
      }
    }
    
    return { success: true, templates };
  } catch (err) {
    console.error('Error listing report templates:', err);
    return { success: false, error: err };
  }
}

/**
 * Delete a report template
 */
export async function deleteReportTemplate(templateId: string) {
  try {
    const filePath = path.resolve(__dirname, `../../data/report_templates/${templateId}.json`);
    await promisify(fs.unlink)(filePath);
    return { success: true };
  } catch (err) {
    console.error('Error deleting report template:', err);
    return { success: false, error: err };
  }
}