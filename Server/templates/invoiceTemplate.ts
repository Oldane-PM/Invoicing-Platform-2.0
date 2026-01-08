/**
 * Invoice PDF Template
 *
 * Renders invoice content using PDFKit.
 * Keeps layout/drawing logic separate from generation service.
 */

import PDFDocument from 'pdfkit';
import { format, parse } from 'date-fns';

/**
 * Invoice data required for PDF generation
 */
export interface InvoiceData {
  // Invoice identification
  invoiceNumber: string;
  invoiceDate: Date;

  // Submission details
  submissionId: string;
  workPeriod: string; // "YYYY-MM"
  projectName: string;

  // Hours and amounts
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
  totalAmount: number;

  // Descriptions
  description: string;
  overtimeDescription?: string | null;

  // Contractor info
  contractorName: string;
  contractorEmail: string;
  contractorAddress?: string;

  // Company/Client info
  companyName: string;
  companyAddressLine1: string;
  companyAddressLine2?: string;
}

/**
 * Format work period "YYYY-MM" to human-readable "Month Year"
 */
function formatWorkPeriod(workPeriod: string): string {
  try {
    const date = parse(workPeriod, 'yyyy-MM', new Date());
    return format(date, 'MMMM yyyy');
  } catch {
    return workPeriod;
  }
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Draw a horizontal line
 */
function drawLine(doc: PDFKit.PDFDocument, y: number, color = '#E5E7EB'): void {
  doc
    .strokeColor(color)
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(545, y)
    .stroke();
}

/**
 * Render the invoice PDF
 * @param doc - PDFKit document instance
 * @param data - Invoice data to render
 */
export function renderInvoice(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const pageWidth = 595; // A4 width in points
  const leftMargin = 50;
  const rightMargin = 545;
  let y = 50;

  // ========================================
  // HEADER SECTION
  // ========================================

  // Invoice title
  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor('#1F2937')
    .text('INVOICE', leftMargin, y);

  // Invoice number on the right
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#6B7280')
    .text(data.invoiceNumber, rightMargin - 150, y + 5, { width: 150, align: 'right' });

  y += 45;

  // Invoice date and work period
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#6B7280')
    .text(`Invoice Date: ${format(data.invoiceDate, 'MMMM d, yyyy')}`, leftMargin, y);

  doc
    .text(`Work Period: ${formatWorkPeriod(data.workPeriod)}`, leftMargin, y + 15);

  doc
    .text(`Submission ID: ${data.submissionId}`, leftMargin, y + 30);

  y += 60;
  drawLine(doc, y);
  y += 20;

  // ========================================
  // PARTIES SECTION (Bill To / Bill From)
  // ========================================

  const columnWidth = 230;

  // Bill From (Contractor)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#6B7280')
    .text('BILL FROM', leftMargin, y);

  y += 15;

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#1F2937')
    .text(data.contractorName, leftMargin, y);

  y += 18;

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#4B5563')
    .text(data.contractorEmail, leftMargin, y);

  if (data.contractorAddress) {
    y += 14;
    doc.text(data.contractorAddress, leftMargin, y, { width: columnWidth });
  }

  // Bill To (Company) - positioned on the right
  const billToStartY = y - (data.contractorAddress ? 47 : 33);

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#6B7280')
    .text('BILL TO', leftMargin + 280, billToStartY);

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#1F2937')
    .text(data.companyName, leftMargin + 280, billToStartY + 15);

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#4B5563')
    .text(data.companyAddressLine1, leftMargin + 280, billToStartY + 33, { width: columnWidth });

  if (data.companyAddressLine2) {
    doc.text(data.companyAddressLine2, leftMargin + 280, billToStartY + 47, { width: columnWidth });
  }

  y += 40;
  drawLine(doc, y);
  y += 25;

  // ========================================
  // PROJECT SECTION
  // ========================================

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#6B7280')
    .text('PROJECT', leftMargin, y);

  y += 15;

  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#1F2937')
    .text(data.projectName, leftMargin, y);

  y += 30;
  drawLine(doc, y);
  y += 25;

  // ========================================
  // LINE ITEMS TABLE
  // ========================================

  // Table header
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#6B7280');

  const col1 = leftMargin;       // Description
  const col2 = 320;              // Hours
  const col3 = 400;              // Rate
  const col4 = 480;              // Amount

  doc.text('DESCRIPTION', col1, y);
  doc.text('HOURS', col2, y);
  doc.text('RATE', col3, y);
  doc.text('AMOUNT', col4, y);

  y += 20;
  drawLine(doc, y, '#D1D5DB');
  y += 15;

  // Regular hours row
  const regularAmount = data.regularHours * data.hourlyRate;

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#1F2937');

  doc.text('Regular Hours', col1, y, { width: 250 });
  doc.text(data.regularHours.toString(), col2, y);
  doc.text(formatCurrency(data.hourlyRate), col3, y);
  doc.text(formatCurrency(regularAmount), col4, y);

  y += 20;

  // Overtime hours row (if applicable)
  let overtimeAmount = 0;
  if (data.overtimeHours > 0) {
    overtimeAmount = data.overtimeHours * data.overtimeRate;

    doc.text('Overtime Hours', col1, y, { width: 250 });
    doc.text(data.overtimeHours.toString(), col2, y);
    doc.text(formatCurrency(data.overtimeRate), col3, y);
    doc.text(formatCurrency(overtimeAmount), col4, y);

    y += 20;
  }

  y += 5;
  drawLine(doc, y, '#D1D5DB');
  y += 15;

  // Total row
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#1F2937');

  doc.text('TOTAL', col1, y);
  doc.text(formatCurrency(data.totalAmount), col4, y);

  y += 35;

  // ========================================
  // WORK DESCRIPTION SECTION
  // ========================================

  drawLine(doc, y);
  y += 25;

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#6B7280')
    .text('WORK DESCRIPTION', leftMargin, y);

  y += 15;

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#4B5563')
    .text(data.description || 'Work completed for this period.', leftMargin, y, {
      width: rightMargin - leftMargin,
      lineGap: 4,
    });

  // Calculate height of description text for positioning
  const descHeight = doc.heightOfString(data.description || 'Work completed for this period.', {
    width: rightMargin - leftMargin,
  });
  y += descHeight + 20;

  // Overtime description (if applicable)
  if (data.overtimeHours > 0 && data.overtimeDescription) {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#6B7280')
      .text('OVERTIME DESCRIPTION', leftMargin, y);

    y += 15;

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#4B5563')
      .text(data.overtimeDescription, leftMargin, y, {
        width: rightMargin - leftMargin,
        lineGap: 4,
      });

    const otDescHeight = doc.heightOfString(data.overtimeDescription, {
      width: rightMargin - leftMargin,
    });
    y += otDescHeight + 20;
  }

  // ========================================
  // FOOTER
  // ========================================

  // Position footer at bottom of page
  const footerY = 750;

  drawLine(doc, footerY - 20, '#E5E7EB');

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#9CA3AF')
    .text(
      'Generated by Invoicing Platform',
      leftMargin,
      footerY,
      { width: rightMargin - leftMargin, align: 'center' }
    );

  doc
    .text(
      `Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`,
      leftMargin,
      footerY + 12,
      { width: rightMargin - leftMargin, align: 'center' }
    );
}
