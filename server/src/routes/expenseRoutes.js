import express from 'express';
import {
    getExpensesByCase,
    createExpense,
    updateExpense,
    attachExpenseReceipt,
    authorizeExpenseReceiptUpload,
} from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeCaseFileUpload, fileReceiver } from '../middleware/caseFileUpload.js';

const router = express.Router();

router.put('/:id', protect, updateExpense);
router.post('/:id/receipt', protect, authorizeExpenseReceiptUpload, fileReceiver(1), attachExpenseReceipt);

router.route('/case/:id')
    .get(protect, getExpensesByCase)
    .post(protect, authorizeCaseFileUpload, fileReceiver(3), createExpense);

export default router;
