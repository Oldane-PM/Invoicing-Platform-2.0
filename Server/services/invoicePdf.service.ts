/**
 * Invoice PDF Generation Service
 *
 * Uses PDFKit to generate invoice PDFs.
 * Separates PDF generation logic from storage/database concerns.
 */

import PDFDocument from 'pdfkit';
import { renderInvoice, InvoiceData } from '../templates/invoiceTemplate';

/**
 * Generate an invoice PDF as a Buffer
 *
 * @param invoiceData - The data to render in the invoice
 * @returns Promise resolving to the PDF as a Buffer
 */
export async function generateInvoicePdfBuffer(invoiceData: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoiceData.invoiceNumber}`,
          Author: invoiceData.contractorName,
          Subject: `Invoice for ${invoiceData.projectName}`,
          Creator: 'Invoicing Platform',
        },
      });

      // Collect PDF data chunks
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      doc.on('error', (err: Error) => {
        reject(err);
      });

      // Render the invoice content
      renderInvoice(doc, invoiceData);

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate invoice number in format INV-YYYYMM-XXXXXX
 *
 * V1 Implementation: Uses count of existing invoices for the month + 1
 * Future improvement: Use a database sequence for true concurrency safety
 *
 * @param workPeriod - Work period in "YYYY-MM" format
 * @param existingCount - Count of existing invoices for this month
 * @param attempt - Retry attempt number (for collision handling)
 * @returns Generated invoice number
 */
export function generateInvoiceNumber(
  workPeriod: string,
  existingCount: number,
  attempt: number = 0
): string {
  // Extract YYYYMM from work period
  const yyyymm = workPeriod.replace('-', '');

  // Generate sequence number (1-based, with retry offset for collisions)
  const sequenceNum = existingCount + 1 + attempt;

  // Pad to 6 digits
  const paddedSequence = sequenceNum.toString().padStart(6, '0');

  return `INV-${yyyymm}-${paddedSequence}`;
}

/**
 * Build InvoiceData from submission and configuration
 *
 * @param submission - The submission record from database
 * @param config - Company configuration
 * @param invoiceNumber - The generated invoice number
 * @returns InvoiceData ready for PDF generation
 */
export function buildInvoiceData(
  submission: {
    id: string;
    work_period?: string;
    period_start?: string;
    project_name?: string;
    regular_hours?: number;
    overtime_hours?: number;
    description?: string;
    overtime_description?: string;
    total_amount?: number;
    contractor_name?: string;
    contractor_email?: string;
    contractor_address?: string;
  },
  config: {
    companyName: string;
    companyAddressLine1: string;
    companyAddressLine2?: string;
    hourlyRate: number;
    overtimeRate: number;
  },
  invoiceNumber: string
): InvoiceData {
  // Determine work period
  let workPeriod = submission.work_period || '';
  if (!workPeriod && submission.period_start) {
    // Extract YYYY-MM from period_start date
    workPeriod = submission.period_start.substring(0, 7);
  }

  const regularHours = submission.regular_hours || 0;
  const overtimeHours = submission.overtime_hours || 0;

  // Calculate total if not provided
  const totalAmount =
    submission.total_amount ||
    regularHours * config.hourlyRate + overtimeHours * config.overtimeRate;

  return {
    invoiceNumber,
    invoiceDate: new Date(),
    submissionId: submission.id,
    workPeriod,
    projectName: submission.project_name || 'General Work',
    regularHours,
    overtimeHours,
    hourlyRate: config.hourlyRate,
    overtimeRate: config.overtimeRate,
    totalAmount,
    description: submission.description || 'Work completed for this period.',
    overtimeDescription: submission.overtime_description || null,
    contractorName: submission.contractor_name || 'Contractor',
    contractorEmail: submission.contractor_email || '',
    contractorAddress: submission.contractor_address,
    companyName: config.companyName,
    companyAddressLine1: config.companyAddressLine1,
    companyAddressLine2: config.companyAddressLine2,
  };
}
