import express from 'express';
import { generateDocumentController } from '../controllers/documentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate', protect, generateDocumentController);

export default router;
