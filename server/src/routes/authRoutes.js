import express from 'express';
import { register, login, getMe, changePassword } from '../controllers/authController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';
import { accountLinkLimit, loginNetworkLimit, loginAccountLimit, registrationLimit } from '../middleware/authRateLimits.js';
import { issueRecoveryLink, redeemAccountLink } from '../controllers/accountAccessController.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
    }
    next();
};

router.post('/register', registrationLimit, [
    body('name', 'El nombre es requerido').isString().bail().trim().notEmpty(),
    body('email', 'Ingresá un email válido').isString().bail().trim().isEmail(),
    body('password', 'La contraseña debe tener al menos 6 caracteres').isString().bail().isLength({ min: 6 }),
], validate, register);

router.post('/login', loginNetworkLimit, [
    body('email', 'Ingresá un email válido').isString().bail().trim().isEmail(),
    body('password', 'La contraseña es requerida').isString().bail().notEmpty(),
], validate, loginAccountLimit, login);

router.get('/me', protect, getMe);

router.post('/recovery-links', protect, superAdmin, [
    body('email', 'Ingresá un email válido').isString().bail().trim().isEmail(),
], validate, issueRecoveryLink);

router.post('/account-links/redeem', accountLinkLimit, [
    body('token', 'Ingresá un enlace válido').isString().bail().matches(/^[A-Za-z0-9_-]{43}$/),
    body('password', 'Elegí una contraseña de al menos 12 caracteres').isString().bail().isLength({ min: 12 })
        .bail().custom(value => Buffer.byteLength(value, 'utf8') <= 72)
        .withMessage('La contraseña supera el tamaño permitido. Elegí una más corta.'),
], validate, redeemAccountLink);

router.put('/change-password', [
    protect,
    body('currentPassword', 'La contraseña actual es requerida').isString().bail().notEmpty(),
    body('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isString().bail().isLength({ min: 6 }),
], validate, changePassword);

export default router;
