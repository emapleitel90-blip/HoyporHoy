import express from 'express';
import { getGeneralStats, getCaseLoadByLawyer } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getGeneralStats);
router.get('/caseload', protect, getCaseLoadByLawyer);

export default router;
