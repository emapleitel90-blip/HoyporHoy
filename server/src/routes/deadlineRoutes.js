import express from 'express';
import {
    getDeadlinesByCase,
    createDeadline,
    updateDeadline,
    deleteDeadline,
    getUpcomingDeadlines,
} from '../controllers/deadlineController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas de plazos (Requieren autenticación)
router.get('/upcoming', protect, getUpcomingDeadlines);

router.route('/:id')
    .put(protect, updateDeadline)
    .delete(protect, deleteDeadline);

// Estas rutas idealmente se montarían bajo /api/cases/:id/deadlines,
// pero por simplicidad de enrutamiento asumiendo la estructura actual:
router.route('/case/:id')
    .get(protect, getDeadlinesByCase)
    .post(protect, createDeadline);

export default router;
