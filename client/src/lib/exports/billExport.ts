import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { Bill, ShipDuty } from '@shared/schema';

interface BillExportData {
  bill: Bill;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  selectedDuties: ShipDutyDetail[];
  employeeNames: Record<number, string>;
}

interface ShipDutyDetail {
  id: number;
  dutyDate: string;
  employeeId: number;
  employeeName?: string;
  vesselName: string;
  lighterName?: string;
  dutyHours: number;
  salaryRate: number;
  conveyanceAmount: number;
  amount: number;
}

export async function exportBillToDocx(data: BillExportData): Promise<void> {
  const { bill, companyName, companyAddress, companyPhone, companyEmail, selectedDuties, employeeNames } = data;
  
  // Format dates
  const billDate = format(new Date(bill.billDate), 'MMMM dd, yyyy');
  const periodStart = format(new Date(bill.startDate), 'MMMM dd, yyyy');
  const periodEnd = format(new Date(bill.endDate), 'MMMM dd, yyyy');
  
  // Create document
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 28,
            bold: true,
            color: "2C5282"
          },
          paragraph: {
            spacing: {
              after: 120
            }
          }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: {
            size: 24,
            bold: true
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120
            }
          }
        }
      ]
    },
    sections: [
      {
        properties: {},
        children: [
          // Company Header
          new Paragraph({
            text: companyName.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
          }),
          
          new Paragraph({
            text: companyAddress || "",
            alignment: AlignmentType.CENTER
          }),
          
          new Paragraph({
            text: `Phone: ${companyPhone || ""} | Email: ${companyEmail || ""}`,
            alignment: AlignmentType.CENTER
          }),
          
          new Paragraph({
            text: "MARINE BILL",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 400,
              after: 200
            }
          }),
          
          // Bill Information
          new Paragraph({
            children: [
              new TextRun({ text: "Bill No: ", bold: true }),
              new TextRun(bill.billNumber)
            ],
            spacing: { after: 120 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Date: ", bold: true }),
              new TextRun(billDate)
            ],
            spacing: { after: 120 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Client: ", bold: true }),
              new TextRun(bill.clientName)
            ],
            spacing: { after: 120 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({ text: "Bill Period: ", bold: true }),
              new TextRun(`${periodStart} to ${periodEnd}`)
            ],
            spacing: { after: 200 }
          }),
          
          // Duty Details Table
          new Paragraph({
            text: "DUTY DETAILS",
            heading: HeadingLevel.HEADING_3,
            spacing: { after: 200 }
          }),
          
          createDutyTable(selectedDuties, employeeNames),
          
          // Summary Section
          new Paragraph({
            text: "BILL SUMMARY",
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 200 }
          }),
          
          createSummaryTable(bill),
          
          // Footer
          new Paragraph({
            text: "Thank you for your business.",
            spacing: { before: 400, after: 120 }
          }),
          
          new Paragraph({
            text: `Generated on ${format(new Date(), 'MMMM dd, yyyy')} by ${bill.generatedBy}`,
            spacing: { before: 120 }
          }),
        ]
      }
    ]
  });
  
  // Generate and save document
  const fileName = `${bill.clientName.replace(/\s+/g, '_')}_${format(new Date(bill.billDate), 'MMM_yyyy')}.docx`;
  
  // Generate buffer
  const buffer = await Packer.toBuffer(doc);
  
  // Save file
  saveAs(new Blob([buffer]), fileName);
}

function createDutyTable(duties: ShipDutyDetail[], employeeNames: Record<number, string>): Table {
  const rows: TableRow[] = [];
  
  // Header row
  rows.push(
    new TableRow({
      tableHeader: true,
      children: [
        createTableCell("Date", true),
        createTableCell("Vessel Name", true),
        createTableCell("Lighter", true),
        createTableCell("Employee", true),
        createTableCell("Duty Hours", true),
        createTableCell("Rate (৳)", true),
        createTableCell("Amount (৳)", true),
        createTableCell("Conveyance (৳)", true)
      ]
    })
  );
  
  // Data rows
  duties.forEach(duty => {
    const employeeName = duty.employeeName || employeeNames[duty.employeeId] || `Employee #${duty.employeeId}`;
    const dutyDate = format(new Date(duty.dutyDate), 'MMM dd, yyyy');
    
    rows.push(
      new TableRow({
        children: [
          createTableCell(dutyDate),
          createTableCell(duty.vesselName),
          createTableCell(duty.lighterName || "—"),
          createTableCell(employeeName),
          createTableCell(duty.dutyHours.toString()),
          createTableCell(Number(duty.salaryRate).toFixed(2)),
          createTableCell(Number(duty.amount).toFixed(2)),
          createTableCell(Number(duty.conveyanceAmount).toFixed(2))
        ]
      })
    );
  });
  
  // Total row
  const totalAmount = duties.reduce((sum, duty) => sum + Number(duty.amount), 0);
  const totalConveyance = duties.reduce((sum, duty) => sum + Number(duty.conveyanceAmount), 0);
  
  rows.push(
    new TableRow({
      children: [
        createTableCell("TOTAL", true),
        createTableCell("", true),
        createTableCell("", true),
        createTableCell("", true),
        createTableCell("", true),
        createTableCell("", true),
        createTableCell(totalAmount.toFixed(2), true),
        createTableCell(totalConveyance.toFixed(2), true)
      ]
    })
  );
  
  return new Table({
    width: {
      size: 100,
      type: "pct"
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    },
    rows
  });
}

function createSummaryTable(bill: Bill): Table {
  return new Table({
    width: {
      size: 50,
      type: "pct"
    },
    alignment: AlignmentType.RIGHT,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 }
    },
    rows: [
      new TableRow({
        children: [
          createTableCell("Total Duty Amount:", true),
          createTableCell(`৳${Number(bill.totalDutyAmount).toFixed(2)}`)
        ]
      }),
      new TableRow({
        children: [
          createTableCell("Total Conveyance:", true),
          createTableCell(`৳${Number(bill.totalConveyance).toFixed(2)}`)
        ]
      }),
      new TableRow({
        children: [
          createTableCell(`VAT (${Number(bill.vatPercentage).toFixed(2)}%):`, true),
          createTableCell(`৳${Number(bill.vatAmount).toFixed(2)}`)
        ]
      }),
      new TableRow({
        children: [
          createTableCell(`AIT (${Number(bill.aitPercentage).toFixed(2)}%):`, true),
          createTableCell(`৳${Number(bill.aitAmount).toFixed(2)}`)
        ]
      }),
      new TableRow({
        children: [
          createTableCell("Gross Amount:", true),
          createTableCell(`৳${Number(bill.grossAmount).toFixed(2)}`)
        ]
      }),
      new TableRow({
        children: [
          createTableCell("Net Payable:", true, true),
          createTableCell(`৳${Number(bill.netPayable).toFixed(2)}`, true, true)
        ]
      })
    ]
  });
}

function createTableCell(text: string, bold: boolean = false, highlight: boolean = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            color: highlight ? "2C5282" : undefined,
            size: highlight ? 24 : undefined
          })
        ]
      })
    ],
    margins: {
      top: 100,
      bottom: 100,
      left: 150,
      right: 150
    }
  });
}