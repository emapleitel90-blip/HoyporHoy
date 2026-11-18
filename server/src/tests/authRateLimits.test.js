import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const { login, register } = vi.hoisted(() => ({
    login: vi.fn((req, res) => res.sendStatus(req.body.password === 'correct-password' ? 200 : 401)),
    register: vi.fn((_req, res) => res.sendStatus(201)),
}));
vi.mock('../controllers/authController.js', () => ({
    login, register, getMe: vi.fn(), changePassword: vi.fn(),
}));

async function appWithAuth({ behindTestProxy = false } = {}) {
    vi.resetModules();
    vi.clearAllMocks();
    const app = express();
    if (behindTestProxy) app.set('trust proxy', 'loopback');
    app.use(express.json());
    app.use('/auth', (await import('../routes/authRoutes.js')).default);
    return app;
}

function loginAttempt(app, { ip, email = 'user@test.invalid', password = 'wrong-password' } = {}) {
    const req = request(app).post('/auth/login').send({ email, password });
    return ip ? req.set('X-Forwarded-For', ip) : req;
}

afterEach(() => vi.useRealTimers());

describe('Límites del ingreso y registro', () => {
    it('limita los fallos del mismo correo y red, ofrece un reintento y deja ingresar al vencer la espera', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const app = await appWithAuth({ behindTestProxy: true });
        const ip = '192.0.2.1';
        for (let i = 0; i < 5; i++) {
            const email = i % 2 === 0 ? ' user@test.invalid ' : 'USER@test.invalid';
            expect((await loginAttempt(app, { ip, email })).status).toBe(401);
        }
        const blocked = await loginAttempt(app, { ip });
        expect(blocked.status).toBe(429);
        expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
        expect(blocked.body.message).toContain('Volvé a intentar');
        expect(login).toHaveBeenCalledTimes(5);
        expect((await loginAttempt(app, { ip: '192.0.2.2', password: 'correct-password' })).status).toBe(200);
        expect((await loginAttempt(app, { ip, email: 'other@test.invalid', password: 'correct-password' })).status).toBe(200);
        vi.setSystemTime(Date.now() + 15 * 60_000);
        expect((await loginAttempt(app, { ip, password: 'correct-password' })).status).toBe(200);
    });

    it('deja los ingresos exitosos fuera del cupo de fallos', async () => {
        const app = await appWithAuth();
        for (let i = 0; i < 6; i++) {
            expect((await loginAttempt(app, { password: 'correct-password' })).status).toBe(200);
        }
    });

    it('limita el total de intentos de ingreso por red aunque cambie el correo', async () => {
        const app = await appWithAuth();
        for (let i = 0; i < 60; i++) {
            expect((await loginAttempt(app, { email: `user${i}@test.invalid` })).status).toBe(401);
        }
        expect((await loginAttempt(app, { email: 'other@test.invalid' })).status).toBe(429);
        expect(login).toHaveBeenCalledTimes(60);
    });

    it('aplica el cupo de registro a la conexión directa y mantiene un cupo independiente para el ingreso', async () => {
        const app = await appWithAuth();
        const attempt = number => request(app).post('/auth/register')
            .set('X-Forwarded-For', `192.0.2.${number + 1}`)
            .send({ name: 'Cuenta de prueba', email: `user${number}@test.invalid`, password: 'test-password' });
        for (let i = 0; i < 20; i++) expect((await attempt(i)).status).toBe(201);
        const blocked = await attempt(20);
        expect(blocked.status).toBe(429);
        expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
        expect(register).toHaveBeenCalledTimes(20);
        expect((await loginAttempt(app, { password: 'correct-password' })).status).toBe(200);
    });
});
