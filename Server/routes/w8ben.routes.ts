import { Router } from 'express';
import multer from 'multer';
import { submitW8BenForm, getW8BenForm, returnW8BenForm, uploadW8BenForm } from '../controllers/w8ben.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint to submit a new W-8BEN form
router.post('/submit', submitW8BenForm);

// Endpoint to upload a W-8BEN form PDF directly
router.post('/upload', upload.single('w8ben'), uploadW8BenForm);

// Endpoint to fetch an existing W-8BEN form for a contractor
router.get('/:contractorId', getW8BenForm);

// Endpoint for admin/manager to return a form for review
router.post('/:contractorId/return', returnW8BenForm);

export default router;
