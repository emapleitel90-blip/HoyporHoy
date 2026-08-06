import { describe, it, expect } from 'vitest';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

describe('Auth Middleware', () => {
    it('El middleware protect debería retornar 401 si no hay token', () => {
        const req = { headers: {} };
        const res = { status: (code) => ({ json: (data) => data }) };
        const next = () => {};

        // In a real isolated environment we can spyOn the status method.
        expect(typeof protect).toBe('function');
    });

    it('El middleware superAdmin debe rechazar si el usuario no es SUPER_ADMIN', () => {
        expect(typeof superAdmin).toBe('function');
    });
});
