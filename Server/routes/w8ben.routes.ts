import { Router } from 'express';
import { submitW8BenForm, getW8BenForm, returnW8BenForm } from '../controllers/w8ben.controller';

const router = Router();

// Endpoint to submit a new W-8BEN form
router.post('/submit', submitW8BenForm);

// Endpoint to fetch an existing W-8BEN form for a contractor
router.get('/:contractorId', getW8BenForm);

// Endpoint for admin/manager to return a form for review
router.post('/:contractorId/return', returnW8BenForm);

export default router;
