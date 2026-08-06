import express from 'express';
import { triggerFileOptimizer } from '../controllers/optimizerController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Solo SUPER_ADMIN o el script tester puede requerir una limpieza
router.post('/clean', protect, superAdmin, triggerFileOptimizer);

export default router;
