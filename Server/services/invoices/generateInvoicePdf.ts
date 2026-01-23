/**
 * Invoice PDF Generation Service
 * 
 * Generates professional invoice PDFs using PDFKit.
 * Layout matches the reference invoice design.
 */

import PDFDocument from 'pdfkit';
import { format, addDays } from 'date-fns';

// Invoice data interface
export interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string;
  invoiceDate: Date;
  dueDays: number;
  currency: string;

  // Contractor (From)
  contractor: {
    name: string;
    address: string;
    email: string;
  };

  // Client/Company (Bill To)
  billTo: {
    companyName: string;
    address: string;
    country: string;
  };

  // Line items
  lineItems: Array<{
    description: string;
    hours: number;
    rate: number;
    amount: number;
  }>;

  // Totals
  totalAmount: number;

  // Banking details
  banking: {
    payableTo: string;
    bankName: string;
    bankAddress?: string;
    swiftCode?: string;
    routingNumber?: string;
    accountNumber: string;
    accountType?: string;
    intermediaryBank?: string;
  };
}

// Color and font configuration
const COLORS = {
  primary: '#1a1a2e',     // Dark navy for headers
  secondary: '#666666',   // Gray for labels
  accent: '#2563eb',      // Blue for highlights
  border: '#e5e5e5',      // Light gray for borders
  background: '#f8f9fa',  // Light background
};

const FONTS = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
};

/**
 * Generate an invoice PDF as a Buffer
 */
export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${data.invoiceNumber}`,
          Author: data.contractor.name,
          Subject: 'Invoice',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Draw the invoice content
      drawHeader(doc, data);
      drawFromSection(doc, data);
      drawBillToSection(doc, data);
      drawLineItemsTable(doc, data);
      drawTotalSection(doc, data);
      drawBankingSection(doc, data);
      drawFooter(doc);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function drawHeader(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  
  // Title
  doc
    .font(FONTS.bold)
    .fontSize(28)
    .fillColor(COLORS.primary)
    .text('INVOICE', 50, 50);

  // Invoice details on the right
  const rightX = doc.page.width - 200;
  
  doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.secondary);
  
  doc.text('Invoice No:', rightX, 50, { continued: true });
  doc.font(FONTS.bold).fillColor(COLORS.primary).text(` ${data.invoiceNumber}`);
  
  doc.font(FONTS.regular).fillColor(COLORS.secondary);
  doc.text('Date:', rightX, 65, { continued: true });
  doc.font(FONTS.bold).fillColor(COLORS.primary).text(` ${format(data.invoiceDate, 'MMMM d, yyyy')}`);
  
  const dueDate = addDays(data.invoiceDate, data.dueDays);
  doc.font(FONTS.regular).fillColor(COLORS.secondary);
  doc.text('Due Date:', rightX, 80, { continued: true });
  doc.font(FONTS.bold).fillColor(COLORS.primary).text(` ${format(dueDate, 'MMMM d, yyyy')}`);

  // Horizontal line under header
  doc
    .moveTo(50, 110)
    .lineTo(doc.page.width - 50, 110)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
}

function drawFromSection(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = 130;

  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(COLORS.accent)
    .text('FROM', 50, startY);

  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.primary)
    .text(data.contractor.name, 50, startY + 18);

  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.secondary)
    .text(data.contractor.address, 50, startY + 35, { width: 200 });

  // Add email below address
  const addressHeight = doc.heightOfString(data.contractor.address, { width: 200 });
  doc.text(data.contractor.email, 50, startY + 35 + addressHeight + 5);
}

function drawBillToSection(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = 130;
  const rightX = 300;

  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(COLORS.accent)
    .text('BILL TO', rightX, startY);

  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor(COLORS.primary)
    .text(data.billTo.companyName, rightX, startY + 18);

  doc
    .font(FONTS.regular)
    .fontSize(10)
    .fillColor(COLORS.secondary)
    .text(data.billTo.address, rightX, startY + 35, { width: 200 });

  const addressHeight = doc.heightOfString(data.billTo.address, { width: 200 });
  doc.text(data.billTo.country, rightX, startY + 35 + addressHeight + 5);
}

function drawLineItemsTable(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = 250;
  const tableTop = startY;
  const tableLeft = 50;
  const tableRight = doc.page.width - 50;
  const tableWidth = tableRight - tableLeft;

  // Column widths (total = 100%)
  const columns = {
    description: { width: tableWidth * 0.45, x: tableLeft },
    hours: { width: tableWidth * 0.15, x: tableLeft + tableWidth * 0.45 },
    rate: { width: tableWidth * 0.20, x: tableLeft + tableWidth * 0.60 },
    amount: { width: tableWidth * 0.20, x: tableLeft + tableWidth * 0.80 },
  };

  // Header background
  doc
    .rect(tableLeft, tableTop, tableWidth, 25)
    .fillColor(COLORS.primary)
    .fill();

  // Header text
  doc
    .font(FONTS.bold)
    .fontSize(10)
    .fillColor('#ffffff')
    .text('Description', columns.description.x + 10, tableTop + 8)
    .text('Hours', columns.hours.x + 10, tableTop + 8)
    .text('Rate', columns.rate.x + 10, tableTop + 8)
    .text('Amount', columns.amount.x + 10, tableTop + 8);

  // Line items
  let rowY = tableTop + 30;
  const rowHeight = 35;

  data.lineItems.forEach((item, index) => {
    // Alternating row background
    if (index % 2 === 0) {
      doc
        .rect(tableLeft, rowY, tableWidth, rowHeight)
        .fillColor(COLORS.background)
        .fill();
    }

    doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.primary);
    
    // Wrap description if too long
    doc.text(item.description, columns.description.x + 10, rowY + 10, {
      width: columns.description.width - 20,
    });

    doc.text(item.hours.toFixed(1), columns.hours.x + 10, rowY + 10);
    doc.text(formatCurrency(item.rate, data.currency), columns.rate.x + 10, rowY + 10);
    doc.text(formatCurrency(item.amount, data.currency), columns.amount.x + 10, rowY + 10);

    rowY += rowHeight;
  });

  // Store the table end position for the total section
  (doc as any)._invoiceTableEndY = rowY;
}

function drawTotalSection(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const tableEndY = (doc as any)._invoiceTableEndY || 350;
  const totalY = tableEndY + 15;
  const rightX = doc.page.width - 200;

  // Total box background
  doc
    .rect(rightX - 10, totalY - 5, 160, 35)
    .fillColor(COLORS.primary)
    .fill();

  doc
    .font(FONTS.bold)
    .fontSize(12)
    .fillColor('#ffffff')
    .text('TOTAL:', rightX, totalY + 5, { continued: true })
    .text(` ${formatCurrency(data.totalAmount, data.currency)}`, { align: 'right' });

  // Store position for banking section
  (doc as any)._invoiceTotalEndY = totalY + 45;
}

function drawBankingSection(doc: PDFKit.PDFDocument, data: InvoiceData): void {
  const startY = (doc as any)._invoiceTotalEndY || 400;
  const sectionY = Math.max(startY + 30, 450);

  // Section header
  doc
    .font(FONTS.bold)
    .fontSize(11)
    .fillColor(COLORS.accent)
    .text('PAYMENT INFORMATION', 50, sectionY);

  // Banking details
  const detailsY = sectionY + 20;
  const labelWidth = 130;

  doc.font(FONTS.regular).fontSize(10).fillColor(COLORS.secondary);

  const bankingFields = [
    { label: 'Payable To:', value: data.banking.payableTo },
    { label: 'Bank Name:', value: data.banking.bankName },
    ...(data.banking.bankAddress ? [{ label: 'Bank Address:', value: data.banking.bankAddress }] : []),
    ...(data.banking.swiftCode ? [{ label: 'SWIFT Code:', value: data.banking.swiftCode }] : []),
    ...(data.banking.routingNumber ? [{ label: 'Routing Number:', value: data.banking.routingNumber }] : []),
    { label: 'Account Number:', value: maskAccountNumber(data.banking.accountNumber) },
    ...(data.banking.accountType ? [{ label: 'Account Type:', value: data.banking.accountType }] : []),
    ...(data.banking.intermediaryBank ? [{ label: 'Intermediary Bank:', value: data.banking.intermediaryBank }] : []),
  ];

  let fieldY = detailsY;
  bankingFields.forEach((field) => {
    doc
      .font(FONTS.regular)
      .fillColor(COLORS.secondary)
      .text(field.label, 50, fieldY);
    doc
      .font(FONTS.bold)
      .fillColor(COLORS.primary)
      .text(field.value || 'N/A', 50 + labelWidth, fieldY);
    fieldY += 18;
  });
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const footerY = doc.page.height - 80;

  // Footer line
  doc
    .moveTo(50, footerY)
    .lineTo(doc.page.width - 50, footerY)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();

  doc
    .font(FONTS.regular)
    .fontSize(9)
    .fillColor(COLORS.secondary)
    .text('Thank you for your business!', 50, footerY + 15, {
      align: 'center',
      width: doc.page.width - 100,
    });

  doc
    .fontSize(8)
    .text('This invoice was generated automatically. Please contact us for any questions.', 50, footerY + 30, {
      align: 'center',
      width: doc.page.width - 100,
    });
}

/**
 * Format currency with symbol
 */
function formatCurrency(amount: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    JMD: 'J$',
  };
  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Mask account number for security (show last 4 digits)
 */
function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length <= 4) {
    return accountNumber || 'N/A';
  }
  const lastFour = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  return masked + lastFour;
}
