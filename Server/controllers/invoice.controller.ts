/**
 * Invoice Controller
 * 
 * Handles invoice-related API requests:
 * - GET /api/invoices/:submissionId - Get or create invoice (generates on-demand if missing)
 * - POST /api/invoices/:submissionId/generate - Force regenerate invoice for a submission
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../clients/supabase.server';
import {
  getNextInvoiceNumber,
  generateInvoicePdf,
  uploadInvoicePdf,
  getSignedInvoiceUrl,
  type InvoiceData,
} from '../services/invoices';

// Default company info (Bill To) - should be configured via env or database
const DEFAULT_COMPANY_INFO = {
  companyName: process.env.COMPANY_NAME || 'Client Company',
  address: process.env.COMPANY_ADDRESS || '123 Business Street',
  country: process.env.COMPANY_COUNTRY || 'United States',
};

/**
 * GET /api/invoices/:submissionId
 * 
 * Returns signed URL for viewing an invoice PDF.
 * If the invoice doesn't exist yet, it will be generated on-demand.
 * This is the primary endpoint for the "View Invoice" button.
 */
export async function getOrCreateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { submissionId } = req.params;

    if (!submissionId) {
      res.status(400).json({ error: 'Submission ID is required' });
      return;
    }

    const supabase = getSupabaseAdmin();

    // Fetch submission with invoice data
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('invoice_number, invoice_url, invoice_generated_at')
      .eq('id', submissionId)
      .single();

    if (error || !submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // If invoice already exists, return signed URL
    if (submission.invoice_url && submission.invoice_generated_at) {
      const signedUrl = await getSignedInvoiceUrl(submission.invoice_url);
      res.json({
        invoiceUrl: signedUrl,
        invoiceNumber: submission.invoice_number,
        generatedAt: submission.invoice_generated_at,
      });
      return;
    }

    // Invoice doesn't exist - generate it on-demand
    console.log('[invoice.controller] Invoice not found, generating on-demand for submission:', submissionId);
    
    // Delegate to the internal generation logic
    await generateInvoiceInternal(submissionId, res, next);
  } catch (error) {
    console.error('[invoice.controller] Error getting/creating invoice:', error);
    next(error);
  }
}

/**
 * POST /api/invoices/:submissionId/generate
 * 
 * Force generates/regenerates an invoice PDF for a submission.
 * Use this to regenerate an invoice if contractor details changed.
 */
export async function generateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { submissionId } = req.params;

    if (!submissionId) {
      res.status(400).json({ error: 'Submission ID is required' });
      return;
    }

    await generateInvoiceInternal(submissionId, res, next);
  } catch (error) {
    console.error('[invoice.controller] Error generating invoice:', error);
    next(error);
  }
}

/**
 * Internal function that handles the actual invoice generation logic.
 * Used by both getOrCreateInvoice and generateInvoice endpoints.
 */
async function generateInvoiceInternal(
  submissionId: string,
  res: Response,
  next: NextFunction
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch submission with all needed data INCLUDING stored rates for invoice consistency
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select(`
      id,
      contractor_user_id,
      project_name,
      description,
      regular_hours,
      overtime_hours,
      overtime_description,
      total_amount,
      submitted_at,
      created_at,
      invoice_due_days,
      invoice_currency,
      regular_rate,
      overtime_rate,
      rate_type
    `)
    .eq('id', submissionId)
    .single();

  if (subError || !submission) {
    console.error('[invoice.controller] Submission not found:', subError);
    res.status(404).json({ error: 'Submission not found' });
    return;
  }

  const contractorId = submission.contractor_user_id;

  // Fetch contractor profile (personal info + banking)
  const { data: profile, error: profileError } = await supabase
    .from('contractor_profiles')
    .select('*')
    .eq('user_id', contractorId)
    .maybeSingle();

  if (profileError) {
    console.error('[invoice.controller] Error fetching profile:', profileError);
  }

  // Fetch contractor basic info from profiles table
  const { data: userProfile, error: userError } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', contractorId)
    .single();

  if (userError) {
    console.error('[invoice.controller] Error fetching user profile:', userError);
  }

  // CRITICAL: Use stored rates from submission for invoice consistency
  // This ensures submission total === invoice total always
  // Only fall back to contractors table for legacy submissions without stored rates
  let hourlyRate: number;
  let overtimeRate: number;

  if (submission.regular_rate !== null && submission.regular_rate !== undefined) {
    // Use stored rates from submission (preferred - guarantees consistency)
    hourlyRate = submission.regular_rate;
    overtimeRate = submission.overtime_rate || hourlyRate * 1.5;
    console.log('[invoice.controller] Using stored rates from submission:', { hourlyRate, overtimeRate });
  } else {
    // Fallback: fetch from contractors table (for legacy submissions without stored rates)
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('hourly_rate, overtime_rate')
      .eq('contractor_id', contractorId)
      .eq('is_active', true)
      .maybeSingle();

    if (contractorError) {
      console.error('[invoice.controller] Error fetching contractor rates:', contractorError);
    }

    hourlyRate = contractor?.hourly_rate || 75;
    overtimeRate = contractor?.overtime_rate || hourlyRate * 1.5;
    console.log('[invoice.controller] Using rates from contractors table (legacy):', { hourlyRate, overtimeRate });
  }

  // Generate unique invoice number
  const invoiceNumber = await getNextInvoiceNumber();
  const invoiceDate = new Date();
  const dueDays = submission.invoice_due_days || parseInt(process.env.INVOICE_DUE_DAYS || '15', 10);
  const currency = submission.invoice_currency || process.env.INVOICE_CURRENCY || 'USD';

  // Build contractor address from profile
  const addressParts = [
    profile?.address_line1,
    profile?.address_line2,
    profile?.state_parish,
    profile?.postal_code,
    profile?.country,
  ].filter(Boolean);
  const contractorAddress = addressParts.join('\n') || 'Address not provided';

  const lineItems: InvoiceData['lineItems'] = [];

  // Regular hours line item
  if (submission.regular_hours > 0) {
    lineItems.push({
      description: `${submission.project_name || 'General Work'} - Regular Hours`,
      hours: submission.regular_hours,
      rate: hourlyRate,
      amount: submission.regular_hours * hourlyRate,
    });
  }

  // Overtime hours line item
  if (submission.overtime_hours > 0) {
    const otDescription = submission.overtime_description
      ? `${submission.project_name || 'General Work'} - Overtime (${submission.overtime_description})`
      : `${submission.project_name || 'General Work'} - Overtime Hours`;
    lineItems.push({
      description: otDescription,
      hours: submission.overtime_hours,
      rate: overtimeRate,
      amount: submission.overtime_hours * overtimeRate,
    });
  }

  // Build invoice data
  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate,
    dueDays,
    currency,
    contractor: {
      name: profile?.full_name || userProfile?.full_name || 'Contractor',
      address: contractorAddress,
      email: profile?.email || userProfile?.email || '',
    },
    billTo: {
      companyName: DEFAULT_COMPANY_INFO.companyName,
      address: DEFAULT_COMPANY_INFO.address,
      country: DEFAULT_COMPANY_INFO.country,
    },
    lineItems,
    totalAmount: submission.total_amount || 0,
    banking: {
      payableTo: profile?.bank_account_name || profile?.full_name || userProfile?.full_name || 'N/A',
      bankName: profile?.bank_name || 'N/A',
      bankAddress: profile?.bank_address || undefined,
      swiftCode: profile?.swift_code || undefined,
      routingNumber: profile?.bank_routing_number || undefined,
      accountNumber: profile?.bank_account_number || 'N/A',
      accountType: profile?.account_type || undefined,
    },
  };

  console.log('[invoice.controller] Generating PDF for invoice:', invoiceNumber);

  // Generate the PDF
  const pdfBuffer = await generateInvoicePdf(invoiceData);

  // Upload to Supabase Storage
  const uploadResult = await uploadInvoicePdf(
    pdfBuffer,
    contractorId,
    submissionId,
    invoiceNumber
  );

  // Update submission with invoice metadata
  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      invoice_number: invoiceNumber,
      invoice_url: uploadResult.path,
      invoice_generated_at: invoiceDate.toISOString(),
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[invoice.controller] Error updating submission:', updateError);
    // Don't fail the request - PDF is uploaded, just metadata update failed
  }

  // Return signed URL for immediate viewing
  const signedUrl = await getSignedInvoiceUrl(uploadResult.path);

  res.json({
    invoiceUrl: signedUrl,
    invoiceNumber,
    generatedAt: invoiceDate.toISOString(),
  });
}

