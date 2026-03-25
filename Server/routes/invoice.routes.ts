/**
 * Invoice Routes
 * 
 * API endpoints for invoice management.
 */

import { Router } from 'express';
import {
  getOrCreateInvoice,
  generateInvoice,
  replaceInvoiceAfterSubmissionEditHandler,
} from '../controllers/invoice.controller';

const router = Router();

/**
 * GET /api/invoices/:submissionId
 * Get or create invoice for a submission (generates on-demand if missing)
 * 
 * This is the primary endpoint for the "View Invoice" button.
 * 
 * Response:
 * - 200: { invoiceUrl, invoiceNumber, generatedAt }
 * - 404: Submission not found
 */
router.get('/:submissionId', getOrCreateInvoice);

/**
 * POST /api/invoices/:submissionId/generate
 * Force regenerate invoice for a submission
 * 
 * Use this to regenerate an invoice if contractor details changed.
 * 
 * Response:
 * - 200: { invoiceUrl, invoiceNumber, generatedAt }
 * - 404: Submission not found
 */
router.post('/:submissionId/generate', generateInvoice);

/**
 * POST /api/invoices/:submissionId/replace-after-edit
 * Authenticated contractor only — replaces invoice after submission hours were edited.
 */
router.post('/:submissionId/replace-after-edit', replaceInvoiceAfterSubmissionEditHandler);

export default router;
