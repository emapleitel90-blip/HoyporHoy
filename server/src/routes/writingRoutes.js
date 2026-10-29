import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listWritingTemplates, createWritingTemplate } from '../controllers/writingTemplateController.js';
import { listWritings, getWriting, createWriting, createWritingVersion, exportWritingVersion } from '../controllers/writingController.js';

const router = express.Router();
router.use(protect);
router.route('/templates/case/:caseId').get(listWritingTemplates).post(createWritingTemplate);
router.get('/case/:caseId', listWritings);
router.post('/case/:caseId', createWriting);
router.get('/:id', getWriting);
router.get('/:id/versions/:number', getWriting);
router.post('/:id/versions', createWritingVersion);
router.get('/:id/versions/:number/word', exportWritingVersion);
export default router;
