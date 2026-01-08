/**
 * Invoice Routes
 *
 * Handles invoice PDF retrieval with on-demand generation and signed URLs.
 * Key feature: If invoice doesn't exist, it generates it on the fly.
 */

import { Router, Request, Response } from 'express';
import { requireSupabaseAuth } from '../middleware/requireSupabaseAuth';
import { getSupabaseAdmin } from '../lib/supabaseServer';
import {
  generateInvoicePdfBuffer,
  generateInvoiceNumber,
  buildInvoiceData,
} from '../services/invoicePdf.service';

const router = Router();

// Configuration from environment
const getInvoiceSignedUrlTtl = () =>
  parseInt(process.env.INVOICE_SIGNED_URL_TTL_SECONDS || '300', 10);

const getCompanyConfig = () => ({
  companyName: process.env.COMPANY_NAME || 'Your Company',
  companyAddressLine1: process.env.COMPANY_ADDRESS_LINE1 || '123 Business St',
  companyAddressLine2: process.env.COMPANY_ADDRESS_LINE2,
  hourlyRate: parseFloat(process.env.HOURLY_RATE || '75'),
  overtimeRate: parseFloat(process.env.OVERTIME_RATE || '112.5'),
});

/**
 * Generate invoice for a submission (internal helper)
 * Creates PDF, uploads to storage, and updates database
 */
async function generateAndStoreInvoice(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  submission: {
    id: string;
    contractor_user_id: string;
    period_start: string;
    project_name?: string;
    regular_hours?: number;
    overtime_hours?: number;
    description?: string;
    overtime_description?: string;
    total_amount?: number;
  }
): Promise<{
  success: boolean;
  invoiceNumber?: string;
  invoicePath?: string;
  error?: string;
}> {
  try {
    console.log(`[invoice] Generating invoice for submission: ${submission.id}`);

    // Get contractor info for the invoice
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', submission.contractor_user_id)
      .single();

    // Determine work period from period_start
    const workPeriod = submission.period_start?.substring(0, 7) || new Date().toISOString().substring(0, 7);

    // Count existing invoices for this month to generate sequence number
    const { count } = await supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .like('invoice_number', `INV-${workPeriod.replace('-', '')}-%`);

    const invoiceNumber = generateInvoiceNumber(workPeriod, count || 0);

    // Build invoice data
    const config = getCompanyConfig();
    const invoiceData = buildInvoiceData(
      {
        id: submission.id,
        period_start: submission.period_start,
        project_name: submission.project_name,
        regular_hours: submission.regular_hours,
        overtime_hours: submission.overtime_hours,
        description: submission.description,
        overtime_description: submission.overtime_description,
        total_amount: submission.total_amount,
        contractor_name: profile?.full_name || 'Contractor',
        contractor_email: profile?.email || '',
      },
      config,
      invoiceNumber
    );

    // Generate PDF
    const pdfBuffer = await generateInvoicePdfBuffer(invoiceData);

    // Upload to Supabase Storage
    const storagePath = `${submission.contractor_user_id}/${invoiceNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists (for regeneration)
      });

    if (uploadError) {
      console.error('[invoice] Upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // Update submission with invoice info
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        invoice_status: 'GENERATED',
        invoice_number: invoiceNumber,
        invoice_path: storagePath,
        invoice_generated_at: new Date().toISOString(),
        invoice_error: null,
      })
      .eq('id', submission.id);

    if (updateError) {
      console.error('[invoice] Update error:', updateError);
      // PDF is uploaded but DB not updated - still return success
      // The next request will find the PDF
    }

    console.log(`[invoice] Generated invoice ${invoiceNumber} for submission ${submission.id}`);

    return {
      success: true,
      invoiceNumber,
      invoicePath: storagePath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[invoice] Generation error:', errorMessage);

    // Update submission with error status
    try {
      await supabase
        .from('submissions')
        .update({
          invoice_status: 'FAILED',
          invoice_error: errorMessage,
        })
        .eq('id', submission.id);
    } catch (updateErr) {
      console.error('[invoice] Failed to update error status:', updateErr);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * GET /api/submissions/:id/invoice
 *
 * Get a signed URL to download the invoice PDF.
 * If invoice doesn't exist or is in PENDING/FAILED state, generates it on-demand.
 */
router.get(
  '/:id/invoice',
  requireSupabaseAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supabase = getSupabaseAdmin();
    const userId = req.user!.id;
    const submissionId = req.params.id;

    console.log(`[invoice] Request for submission: ${submissionId}, user: ${userId}`);

    try {
      // 1. Fetch submission with all needed fields for invoice generation
      const { data: submission, error: fetchError } = await supabase
        .from('submissions')
        .select(`
          id,
          contractor_user_id,
          period_start,
          project_name,
          regular_hours,
          overtime_hours,
          description,
          overtime_description,
          total_amount,
          invoice_status,
          invoice_path,
          invoice_number,
          invoice_error
        `)
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        console.log(`[invoice] Submission not found: ${submissionId}`);
        res.status(404).json({
          status: 'error',
          message: 'Submission not found',
        });
        return;
      }

      // 2. Enforce ownership
      if (submission.contractor_user_id !== userId) {
        console.log(`[invoice] Access denied: user ${userId} != owner ${submission.contractor_user_id}`);
        res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only view your own invoices.',
        });
        return;
      }

      // 3. Check if we need to generate the invoice
      let invoicePath = submission.invoice_path;
      let invoiceNumber = submission.invoice_number;

      if (!invoicePath || submission.invoice_status !== 'GENERATED') {
        console.log(`[invoice] Invoice not ready (status: ${submission.invoice_status}), generating on-demand...`);

        const result = await generateAndStoreInvoice(supabase, submission);

        if (!result.success) {
          res.status(500).json({
            status: 'failed',
            message: result.error || 'Failed to generate invoice',
            invoice_status: 'FAILED',
          });
          return;
        }

        invoicePath = result.invoicePath!;
        invoiceNumber = result.invoiceNumber!;
      }

      // 4. Generate signed URL
      const ttl = getInvoiceSignedUrlTtl();

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoicePath, ttl);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error('[invoice] Signed URL error:', signedUrlError);

        // Fallback: try to download and stream the file
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('invoices')
          .download(invoicePath);

        if (downloadError || !fileData) {
          console.error('[invoice] Download error:', downloadError);
          res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve invoice',
          });
          return;
        }

        // Stream the PDF directly
        const buffer = Buffer.from(await fileData.arrayBuffer());
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${invoiceNumber || 'invoice'}.pdf"`
        );
        res.send(buffer);
        return;
      }

      // 5. Return signed URL
      console.log(`[invoice] Returning signed URL for: ${invoicePath}`);

      res.json({
        status: 'success',
        data: {
          url: signedUrlData.signedUrl,
          expiresIn: ttl,
          invoiceNumber: invoiceNumber,
        },
      });
    } catch (error) {
      console.error('[invoice] Unexpected error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/submissions/:id/regenerate-invoice
 *
 * Force regenerate an invoice PDF (for fixing errors or updates)
 */
router.post(
  '/:id/regenerate-invoice',
  requireSupabaseAuth,
  async (req: Request, res: Response): Promise<void> => {
    const supabase = getSupabaseAdmin();
    const userId = req.user!.id;
    const submissionId = req.params.id;

    console.log(`[invoice] Regenerate request for submission: ${submissionId}, user: ${userId}`);

    try {
      // Fetch submission
      const { data: submission, error: fetchError } = await supabase
        .from('submissions')
        .select(`
          id,
          contractor_user_id,
          period_start,
          project_name,
          regular_hours,
          overtime_hours,
          description,
          overtime_description,
          total_amount
        `)
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        res.status(404).json({
          status: 'error',
          message: 'Submission not found',
        });
        return;
      }

      // Enforce ownership
      if (submission.contractor_user_id !== userId) {
        res.status(403).json({
          status: 'error',
          message: 'Access denied',
        });
        return;
      }

      // Mark as pending while regenerating
      await supabase
        .from('submissions')
        .update({ invoice_status: 'PENDING' })
        .eq('id', submissionId);

      // Generate new invoice
      const result = await generateAndStoreInvoice(supabase, submission);

      if (!result.success) {
        res.status(500).json({
          status: 'failed',
          message: result.error || 'Failed to regenerate invoice',
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Invoice regenerated successfully',
        data: {
          invoiceNumber: result.invoiceNumber,
        },
      });
    } catch (error) {
      console.error('[invoice] Regenerate error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
);

export default router;
