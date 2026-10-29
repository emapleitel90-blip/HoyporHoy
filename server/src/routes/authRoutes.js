import express from 'express';
import { register, login, getMe, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

router.post('/register', [
    body('name', 'El nombre es requerido').isString().bail().trim().notEmpty(),
    body('email', 'Ingresá un email válido').isString().bail().trim().isEmail(),
    body('password', 'La contraseña debe tener al menos 6 caracteres').isString().bail().isLength({ min: 6 }),
], validate, register);

router.post('/login', [
    body('email', 'Ingresá un email válido').isString().bail().trim().isEmail(),
    body('password', 'La contraseña es requerida').isString().bail().notEmpty(),
], validate, login);

router.get('/me', protect, getMe);

router.put('/change-password', [
    protect,
    body('currentPassword', 'La contraseña actual es requerida').isString().bail().notEmpty(),
    body('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isString().bail().isLength({ min: 6 }),
], validate, changePassword);

export default router;
