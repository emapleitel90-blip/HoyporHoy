import express from 'express';
import {
    getDeadlinesByCase,
    createDeadline,
    updateDeadline,
    deleteDeadline,
    getUpcomingDeadlines,
    getMyDay,
} from '../controllers/deadlineController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas de plazos (Requieren autenticación)
// IMPORTANTE: las rutas fijas van ANTES de las rutas con :id para evitar conflictos
router.get('/upcoming', protect, getUpcomingDeadlines);
router.get('/my-day', protect, getMyDay);

router.route('/:id')
    .put(protect, updateDeadline)
    .delete(protect, deleteDeadline);

// Estas rutas idealmente se montarían bajo /api/cases/:id/deadlines,
// pero por simplicidad de enrutamiento asumiendo la estructura actual:
router.route('/case/:id')
    .get(protect, getDeadlinesByCase)
    .post(protect, createDeadline);

export default router;

