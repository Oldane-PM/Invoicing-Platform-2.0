/**
 * Core invoice generation + replacement after submission edits.
 * Used by HTTP controllers and by replace-after-edit flow.
 */

import { getSupabaseAdmin } from '../../clients/supabase.server';
import { getNextInvoiceNumber } from './invoiceNumber';
import { uploadInvoicePdf, getSignedInvoiceUrl, deleteInvoicePdf } from './invoiceStorage';
import { generateInvoicePdf, type InvoiceData } from './generateInvoicePdf';

const DEFAULT_COMPANY_INFO = {
  companyName: process.env.COMPANY_NAME || 'Intelligent Business Platforms',
  address: process.env.COMPANY_ADDRESS || '12020 Sunrise Valley Dr. Reston, VA, 20191',
  country: process.env.COMPANY_COUNTRY || 'United States',
};

export interface GeneratedInvoiceResult {
  invoiceUrl: string;
  invoiceNumber: string;
  generatedAt: string;
  storagePath: string;
}

/**
 * Returns true when the previous storage object should be removed after uploading a new invoice.
 */
export function shouldDeleteOldStorageFile(oldPath: string | null | undefined, newPath: string): boolean {
  return !!oldPath && oldPath.length > 0 && oldPath !== newPath;
}

/**
 * True when the submission was changed after the stored invoice PDF was generated.
 * GET /api/invoices uses this to avoid serving a PDF that no longer matches hours/totals.
 */
export function isInvoiceStaleVersusSubmission(row: {
  invoice_generated_at: string | null;
  updated_at?: string | null;
  submitted_at?: string | null;
}): boolean {
  if (!row.invoice_generated_at) return false;
  const generatedMs = new Date(row.invoice_generated_at).getTime();
  const revisionMs = new Date(row.updated_at ?? row.submitted_at ?? 0).getTime();
  if (Number.isNaN(revisionMs) || Number.isNaN(generatedMs)) return false;
  return revisionMs > generatedMs;
}

/**
 * Generate PDF from current submission row, upload, persist metadata, return signed URL.
 */
export async function generateInvoiceForSubmission(submissionId: string): Promise<GeneratedInvoiceResult> {
  const supabase = getSupabaseAdmin();

  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select(
      `
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
    `
    )
    .eq('id', submissionId)
    .single();

  if (subError || !submission) {
    throw new Error(subError?.message || 'Submission not found');
  }

  const contractorId = submission.contractor_user_id;

  const { data: profile, error: profileError } = await supabase
    .from('contractor_profiles')
    .select('*')
    .eq('user_id', contractorId)
    .maybeSingle();

  if (profileError) {
    console.error('[generateInvoiceForSubmission] Error fetching profile:', profileError);
  }

  const { data: userProfile, error: userError } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', contractorId)
    .single();

  if (userError) {
    console.error('[generateInvoiceForSubmission] Error fetching user profile:', userError);
  }

  let hourlyRate: number;
  let overtimeRate: number;

  if (submission.regular_rate !== null && submission.regular_rate !== undefined) {
    hourlyRate = submission.regular_rate;
    overtimeRate = submission.overtime_rate || hourlyRate * 1.5;
  } else {
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select('hourly_rate, overtime_rate')
      .eq('contractor_id', contractorId)
      .eq('is_active', true)
      .maybeSingle();

    if (contractorError) {
      console.error('[generateInvoiceForSubmission] Error fetching contractor rates:', contractorError);
    }

    hourlyRate = contractor?.hourly_rate || 75;
    overtimeRate = contractor?.overtime_rate || hourlyRate * 1.5;
  }

  const invoiceNumber = await getNextInvoiceNumber();
  const invoiceDate = new Date();
  const dueDays = submission.invoice_due_days || parseInt(process.env.INVOICE_DUE_DAYS || '15', 10);
  const currency = submission.invoice_currency || process.env.INVOICE_CURRENCY || 'USD';

  const addressParts = [
    profile?.address_line1,
    profile?.address_line2,
    profile?.state_parish,
    profile?.postal_code,
    profile?.country,
  ].filter(Boolean);
  const contractorAddress = addressParts.join('\n') || 'Address not provided';

  const lineItems: InvoiceData['lineItems'] = [];

  if (submission.regular_hours > 0) {
    lineItems.push({
      description: `${submission.project_name || 'General Work'} - Regular Hours`,
      hours: submission.regular_hours,
      rate: hourlyRate,
      amount: submission.regular_hours * hourlyRate,
    });
  }

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

  const pdfBuffer = await generateInvoicePdf(invoiceData);

  const uploadResult = await uploadInvoicePdf(pdfBuffer, contractorId, submissionId, invoiceNumber);

  const { error: updateError } = await supabase
    .from('submissions')
    .update({
      invoice_number: invoiceNumber,
      invoice_url: uploadResult.path,
      invoice_generated_at: invoiceDate.toISOString(),
    })
    .eq('id', submissionId);

  if (updateError) {
    console.error('[generateInvoiceForSubmission] Error updating submission:', updateError);
  }

  const signedUrl = await getSignedInvoiceUrl(uploadResult.path);

  return {
    invoiceUrl: signedUrl,
    invoiceNumber,
    generatedAt: invoiceDate.toISOString(),
    storagePath: uploadResult.path,
  };
}

const REPLACEMENT_ACTION = 'replaced_due_to_submission_edit';

export interface ReplaceInvoiceResult {
  replaced: boolean;
  /** True when a PDF was newly created (no prior invoice on the submission). */
  generated?: boolean;
  invoiceUrl?: string;
  invoiceNumber?: string;
  generatedAt?: string;
  message?: string;
}

/**
 * After contractor edits submitted hours: always create a new invoice PDF from the updated row.
 * If a prior invoice existed, its storage file is removed and the event is audited.
 */
export async function replaceInvoiceAfterSubmissionEdit(
  submissionId: string,
  actorUserId: string
): Promise<ReplaceInvoiceResult> {
  const supabase = getSupabaseAdmin();

  const { data: row, error } = await supabase
    .from('submissions')
    .select('id, contractor_user_id, invoice_url, invoice_number, invoice_generated_at, total_amount')
    .eq('id', submissionId)
    .single();

  if (error || !row) {
    throw new Error(error?.message || 'Submission not found');
  }

  if (row.contractor_user_id !== actorUserId) {
    const err = new Error('Forbidden');
    (err as any).statusCode = 403;
    throw err;
  }

  // Always produce a fresh PDF from the updated submission row — even if they never opened "View Invoice" before.
  if (!row.invoice_url || !row.invoice_generated_at) {
    const generated = await generateInvoiceForSubmission(submissionId);
    return {
      replaced: false,
      generated: true,
      invoiceUrl: generated.invoiceUrl,
      invoiceNumber: generated.invoiceNumber,
      generatedAt: generated.generatedAt,
      message: 'Invoice PDF generated from edited submission',
    };
  }

  const previousInvoiceUrl = row.invoice_url;
  const previousInvoiceNumber = row.invoice_number;
  const previousTotal = row.total_amount;

  const generated = await generateInvoiceForSubmission(submissionId);

  if (shouldDeleteOldStorageFile(previousInvoiceUrl, generated.storagePath)) {
    try {
      await deleteInvoicePdf(previousInvoiceUrl);
    } catch (e) {
      console.error('[replaceInvoiceAfterSubmissionEdit] Failed to delete previous PDF (non-fatal):', e);
    }
  }

  const { data: afterRow } = await supabase
    .from('submissions')
    .select('total_amount')
    .eq('id', submissionId)
    .single();

  const { error: auditError } = await supabase.from('invoice_audit_log').insert({
    submission_id: submissionId,
    action: REPLACEMENT_ACTION,
    previous_invoice_number: previousInvoiceNumber,
    previous_invoice_url: previousInvoiceUrl,
    previous_total_amount: previousTotal,
    new_invoice_number: generated.invoiceNumber,
    new_total_amount: afterRow?.total_amount ?? null,
    actor_user_id: actorUserId,
    metadata: { source: 'vendor_app_submission_edit' },
  });

  if (auditError) {
    console.error('[replaceInvoiceAfterSubmissionEdit] Audit log insert failed:', auditError);
  }

  console.log('[replaceInvoiceAfterSubmissionEdit] Replaced invoice for submission', submissionId, {
    previousInvoiceNumber,
    newInvoiceNumber: generated.invoiceNumber,
  });

  return {
    replaced: true,
    generated: true,
    invoiceUrl: generated.invoiceUrl,
    invoiceNumber: generated.invoiceNumber,
    generatedAt: generated.generatedAt,
  };
}
