import express from 'express';
import { getFormConfig, updateFormConfig, resetFormConfig } from '../controllers/formConfigController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, getFormConfig)
    .post(protect, updateFormConfig);

router.post('/reset', protect, resetFormConfig);

export default router;
