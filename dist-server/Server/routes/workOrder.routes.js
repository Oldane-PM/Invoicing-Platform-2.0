/**
 * Work Order Routes
 *
 * API endpoints for automated work order processing.
 */
import { Router } from 'express';
import { extractWorkOrderHandler } from '../controllers/workOrder.controller';
const router = Router();
/**
 * POST /api/work-order/extract
 * Authenticated contractor/admin only — extracts details from an uploaded work order.
 */
router.post('/extract', extractWorkOrderHandler);
export default router;
