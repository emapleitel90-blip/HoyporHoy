import express from 'express';
import {
    searchJurisprudenceController,
    saveJurisprudenceInsight
} from '../controllers/jurisprudenceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/search', protect, searchJurisprudenceController);
router.post('/save', protect, saveJurisprudenceInsight);

export default router;
