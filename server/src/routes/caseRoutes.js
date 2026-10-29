import express from 'express';
import { getCases, createCase, getCaseById, updateCase, getCaseStats, importCases } from '../controllers/caseController.js';
import { addCaseFile, downloadCaseFile, deleteCaseFile } from '../controllers/caseFileController.js';
import { authorizeCaseFileUpload, receiveCaseFile } from '../middleware/caseFileUpload.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getCaseStats);

router.route('/')
    .get(protect, getCases)
    .post(protect, createCase);

router.route('/:id')
    .get(protect, getCaseById)
    .put(protect, updateCase);

router.post('/:id/files', protect, authorizeCaseFileUpload, receiveCaseFile, addCaseFile);
router.get('/files/:fileId/download', protect, downloadCaseFile);
router.delete('/files/:fileId', protect, deleteCaseFile);

router.post('/import', protect, importCases);

export default router;
