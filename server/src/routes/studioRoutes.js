import express from 'express';
import { getStudios, createStudio, getStudioById, updateStudioStatus, getStudioUsers, createStudioUser, deactivateStudioUser } from '../controllers/studioController.js';
import { protect, superAdmin, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, superAdmin, getStudios)
    .post(protect, superAdmin, createStudio);

router.route('/:id')
    .get(protect, superAdmin, getStudioById);

router.route('/:id/status')
    .put(protect, superAdmin, updateStudioStatus);

router.route('/:id/users')
    .get(protect, admin, getStudioUsers)
    .post(protect, admin, createStudioUser);

router.route('/users/:userId')
    .delete(protect, admin, deactivateStudioUser);

export default router;
