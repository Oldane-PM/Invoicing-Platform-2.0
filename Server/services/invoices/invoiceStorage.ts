/**
 * Invoice Storage Service
 * 
 * Handles uploading invoice PDFs to Supabase Storage
 * and generating signed URLs for access.
 */

import { getSupabaseAdmin } from '../../clients/supabase.server';

const INVOICES_BUCKET = process.env.SUPABASE_INVOICES_BUCKET || 'invoices';

// Signed URL expiry time in seconds (10 minutes)
const SIGNED_URL_EXPIRY = 600;

export interface UploadResult {
  path: string;
  publicUrl?: string;
}

/**
 * Upload invoice PDF to Supabase Storage
 * 
 * @param pdfBuffer - The PDF file as a Buffer
 * @param contractorId - The contractor's user ID
 * @param submissionId - The submission ID
 * @param invoiceNumber - The invoice number (used in filename)
 * @returns The storage path
 */
export async function uploadInvoicePdf(
  pdfBuffer: Buffer,
  contractorId: string,
  submissionId: string,
  invoiceNumber: string
): Promise<UploadResult> {
  const supabase = getSupabaseAdmin();

  // Build the storage path: {contractorId}/{submissionId}/invoice-{invoiceNumber}.pdf
  const sanitizedInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '-');
  const storagePath = `${contractorId}/${submissionId}/invoice-${sanitizedInvoiceNumber}.pdf`;

  console.log('[invoiceStorage] Uploading PDF to:', storagePath);

  const { data, error } = await supabase.storage
    .from(INVOICES_BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('[invoiceStorage] Upload failed:', error);
    throw new Error(`Failed to upload invoice PDF: ${error.message}`);
  }

  console.log('[invoiceStorage] Upload successful:', data.path);

  return {
    path: data.path,
  };
}

/**
 * Generate a signed URL for downloading an invoice PDF
 * 
 * @param storagePath - The path in the invoices bucket
 * @param expiresIn - Expiry time in seconds (default 10 minutes)
 * @returns The signed URL
 */
export async function getSignedInvoiceUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(INVOICES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('[invoiceStorage] Failed to create signed URL:', error);
    throw new Error(`Failed to generate invoice URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Check if an invoice PDF exists in storage
 */
export async function invoicePdfExists(storagePath: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(INVOICES_BUCKET)
    .list(storagePath.split('/').slice(0, -1).join('/'), {
      search: storagePath.split('/').pop(),
    });

  if (error) {
    console.error('[invoiceStorage] Error checking PDF existence:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Delete an invoice PDF from storage
 */
export async function deleteInvoicePdf(storagePath: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(INVOICES_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error('[invoiceStorage] Failed to delete PDF:', error);
    throw new Error(`Failed to delete invoice PDF: ${error.message}`);
  }
}
