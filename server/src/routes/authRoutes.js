import express from 'express';
import { register, login, getMe, changePassword } from '../controllers/authController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { check } from 'express-validator';

const router = express.Router();

router.post('/register', [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], register);

router.post('/login', [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
], login);

router.get('/me', protect, getMe);

router.put('/change-password', [
    protect,
    check('currentPassword', 'La contraseña actual es requerida').exists(),
    check('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], changePassword);

export default router;
