import express from 'express';
import { getCases, createCase, getCaseById, updateCase, getCaseStats, addCaseFile, deleteCaseFile, importCases } from '../controllers/caseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getCaseStats);

router.route('/')
    .get(protect, getCases)
    .post(protect, createCase);

router.route('/:id')
    .get(protect, getCaseById)
    .put(protect, updateCase);

import { upload } from '../middleware/uploadMiddleware.js';

router.post('/:id/files', protect, upload.single('file'), addCaseFile);
router.delete('/files/:fileId', protect, deleteCaseFile);

router.post('/import', protect, importCases);

export default router;
