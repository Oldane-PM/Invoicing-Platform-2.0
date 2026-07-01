import { Router } from 'express';
import {
  getRules,
  upsertRule,
  deleteRule,
  getSamples,
  upsertSample,
  getFields,
  upsertField,
  deleteField,
  getFindings,
  getExtractedData,
} from '../controllers/adminConfig.controller';

const router = Router();

// Rules routing
router.get('/rules/:documentType', getRules);
router.post('/rules', upsertRule);
router.delete('/rules/:id', deleteRule);

// Samples routing
router.get('/samples/:documentType', getSamples);
router.post('/samples', upsertSample);

// Fields routing
router.get('/fields/:documentType', getFields);
router.post('/fields', upsertField);
router.delete('/fields/:id', deleteField);

// Audit logs routing
router.get('/findings/:documentType', getFindings);
router.get('/extracted-data/:documentType', getExtractedData);

export default router;
