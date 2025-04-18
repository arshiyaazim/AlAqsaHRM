import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { storage } from '../storage';
import { ReportTemplate } from './reportTemplates';

// Generate HTML for a report
export async function generateReportHtml(
  templateId: string,
  filters: any = {}
): Promise<string> {
  try {
    // Generate report data
    const reportData = await generateReportData(templateId, filters);

    // Format as HTML
    const { formatReportAsHTML } = await import('./reportTemplates');
    const html = formatReportAsHTML(reportData);
    return html;
  } catch (error) {
    console.error('Error generating HTML report:', error);
    throw error;
  }
}

// Generate PDF for a report
export async function generateReportPdf(
  templateId: string,
  filters: any = {}
): Promise<Buffer> {
  try {
    // Generate report data
    const reportData = await generateReportData(templateId, filters);

    // Format as PDF
    const { formatReportAsPDF } = await import('./reportTemplates');
    const pdfBuffer = await formatReportAsPDF(reportData);
    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

// Generate Excel for a report
export async function generateReportExcel(
  templateId: string,
  filters: any = {},
  outputFilePath?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // Generate report data
    const reportData = await generateReportData(templateId, filters);
    
    // For now, we'll just save the data as JSON since actual Excel generation
    // would require an additional library
    if (outputFilePath) {
      const jsonData = JSON.stringify(reportData, null, 2);
      fs.writeFileSync(outputFilePath, jsonData);
      return { success: true, filePath: outputFilePath };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error generating Excel report:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Main function to generate report data based on template and filters
export async function generateReportData(
  templateId: string,
  filters: any = {}
): Promise<any> {
  try {
    // Load template
    const { loadReportTemplate } = await import('./reportTemplates');
    const template = await loadReportTemplate(templateId);
    
    if (!template) {
      throw new Error(`Report template not found: ${templateId}`);
    }
    
    // Get company details
    const companyDetails = await storage.getCompanyDetails();
    
    // Get data based on template type
    let data: any[] = [];
    const dataType = template.type;
    
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
  } catch (error) {
    console.error('Error generating report data:', error);
    throw error;
  }
}