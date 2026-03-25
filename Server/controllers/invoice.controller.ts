/**
 * Invoice Controller
 *
 * Handles invoice-related API requests:
 * - GET /api/invoices/:submissionId - Get or create invoice (generates on-demand if missing)
 * - POST /api/invoices/:submissionId/generate - Force regenerate invoice for a submission
 * - POST /api/invoices/:submissionId/replace-after-edit - Replace invoice after contractor edits hours (authenticated)
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../clients/supabase.server';
import { getSignedInvoiceUrl, deleteInvoicePdf } from '../services/invoices';
import {
  generateInvoiceForSubmission,
  replaceInvoiceAfterSubmissionEdit,
  shouldDeleteOldStorageFile,
  isInvoiceStaleVersusSubmission,
} from '../services/invoices/generateInvoiceForSubmission';
import { auth } from '../../src/lib/auth';

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

    const { data: submission, error } = await supabase
      .from('submissions')
      .select('invoice_number, invoice_url, invoice_generated_at, updated_at, submitted_at')
      .eq('id', submissionId)
      .single();

    if (error || !submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const hasStoredInvoice = !!(submission.invoice_url && submission.invoice_generated_at);
    const stale = hasStoredInvoice && isInvoiceStaleVersusSubmission(submission);

    // Fresh PDF already on disk and matches current submission — return signed URL only
    if (hasStoredInvoice && !stale) {
      const signedUrl = await getSignedInvoiceUrl(submission.invoice_url!);
      res.json({
        invoiceUrl: signedUrl,
        invoiceNumber: submission.invoice_number,
        generatedAt: submission.invoice_generated_at,
      });
      return;
    }

    // Missing invoice, or submission edited after last PDF — regenerate from current row
    if (stale) {
      console.log(
        '[invoice.controller] Invoice older than submission revision; regenerating for submission:',
        submissionId
      );
    } else {
      console.log('[invoice.controller] Invoice not found, generating on-demand for submission:', submissionId);
    }

    const previousPath = stale ? submission.invoice_url : null;
    const result = await generateInvoiceForSubmission(submissionId);

    if (previousPath && shouldDeleteOldStorageFile(previousPath, result.storagePath)) {
      try {
        await deleteInvoicePdf(previousPath);
      } catch (e) {
        console.error('[invoice.controller] Failed to delete stale invoice PDF:', e);
      }
    }

    res.json({
      invoiceUrl: result.invoiceUrl,
      invoiceNumber: result.invoiceNumber,
      generatedAt: result.generatedAt,
    });
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

    const result = await generateInvoiceForSubmission(submissionId);
    res.json({
      invoiceUrl: result.invoiceUrl,
      invoiceNumber: result.invoiceNumber,
      generatedAt: result.generatedAt,
    });
  } catch (error) {
    console.error('[invoice.controller] Error generating invoice:', error);
    next(error);
  }
}

/**
 * POST /api/invoices/:submissionId/replace-after-edit
 *
 * Called after the contractor updates submitted hours when an invoice already existed.
 * Removes the previous PDF from storage (when path changes) and creates a new invoice from the current submission row.
 */
export async function replaceInvoiceAfterSubmissionEditHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session?.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { submissionId } = req.params;

    if (!submissionId) {
      res.status(400).json({ error: 'Submission ID is required' });
      return;
    }

    const outcome = await replaceInvoiceAfterSubmissionEdit(submissionId, session.user.id);
    res.json(outcome);
  } catch (error: any) {
    if (error?.statusCode === 403) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    console.error('[invoice.controller] Error replacing invoice:', error);
    next(error);
  }
}
