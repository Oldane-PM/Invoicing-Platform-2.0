/**
 * Work Order Routes
 * 
 * API endpoints for automated work order processing.
 */

import { Router } from 'express';
import { extractWorkOrderHandler, extractInvoiceHandler } from '../controllers/workOrder.controller';

const router = Router();

/**
 * POST /api/work-order/extract
 * Authenticated contractor/admin only — extracts details from an uploaded work order.
 */
router.post('/extract', extractWorkOrderHandler);

/**
 * POST /api/work-order/extract-invoice
 * Authenticated contractor/admin only — extracts details from a previous invoice.
 */
router.post('/extract-invoice', extractInvoiceHandler);

export default router;
