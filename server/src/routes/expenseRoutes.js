import express from 'express';
import {
    getExpensesByCase,
    createExpense,
    updateExpense
} from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.put('/:id', protect, updateExpense);

router.route('/case/:id')
    .get(protect, getExpensesByCase)
    .post(protect, createExpense);

export default router;
