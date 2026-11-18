import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-registration-'));
const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET'].map(key => [key, process.env[key]]));
const credentials = { name: 'Persona de prueba', email: 'public@test.invalid', password: 'test-password-123' };
let app, prisma, adminToken, publicToken;
const register = body => request(app).post('/api/auth/register').send({ ...credentials, ...body });

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    await prisma.studio.create({ data: { id: 'studio-a', name: 'Estudio de prueba', cuit: 'test-registration' } });
    await prisma.user.create({ data: { id: 'admin', name: 'Admin', email: 'admin@test.invalid',
        password: await bcrypt.hash(credentials.password, 10), role: 'ADMIN', studioId: 'studio-a' } });
    adminToken = jwt.sign({ id: 'admin' }, process.env.JWT_SECRET);
    app = express();
    app.use(express.json());
    app.use('/api/auth', (await import('../routes/authRoutes.js')).default);
    app.use('/api/studios', (await import('../routes/studioRoutes.js')).default);
}, 30000);

afterAll(async () => {
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-registration-')) {
        throw new Error('Unexpected test directory');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Registro público y validación de autenticación', () => {
    it.each(['SUPER_ADMIN', 'ADMIN', 'LAWYER', 'OPERATOR', null, ['SUPER_ADMIN']])('rechaza el rol enviado por el cliente: %j', async role => {
        const before = await prisma.user.count();
        const result = await register({ role });
        expect(result.status).toBe(400);
        expect(result.body).not.toHaveProperty('token');
        expect(await prisma.user.count()).toBe(before);
    });

    it.each(['studio-a', null, { id: 'studio-a' }])('rechaza la pertenencia a estudio enviada por el cliente: %j', async studioId => {
        const result = await register({ studioId });
        expect(result.status).toBe(400);
        expect(await prisma.user.findUnique({ where: { email: credentials.email } })).toBeNull();
    });

    it.each([
        { name: '   ' }, { name: {} }, { email: 'invalid' }, { email: ['public@test.invalid'] },
        { password: '123' }, { password: { length: 10 } },
    ])('rechaza datos inválidos sin crear una cuenta: %j', async body => {
        expect((await register(body)).status).toBe(400);
        expect(await prisma.user.count()).toBe(1);
    });

    it('crea un operador independiente, guarda el hash y emite una sesión válida', async () => {
        const result = await register({});
        expect(result.status).toBe(201);
        expect(result.body).toMatchObject({ role: 'OPERATOR', studioId: null, email: credentials.email });
        expect(result.body).not.toHaveProperty('password');
        const saved = await prisma.user.findUnique({ where: { email: credentials.email } });
        expect(saved).toMatchObject({ role: 'OPERATOR', studioId: null });
        expect(saved.password).not.toBe(credentials.password);
        expect(await bcrypt.compare(credentials.password, saved.password)).toBe(true);
        expect(jwt.verify(result.body.token, process.env.JWT_SECRET)).toMatchObject({ id: saved.id, role: 'OPERATOR' });
        publicToken = result.body.token;
        const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${publicToken}`);
        expect(me.status).toBe(200);
        expect(me.body).toMatchObject({ id: saved.id, role: 'OPERATOR', studioId: null });
    });

    it('la cuenta pública no puede listar estudios, leer sus integrantes ni crear usuarios en ellos', async () => {
        const client = method => request(app)[method];
        for (const url of ['/api/studios', '/api/studios/studio-a/users']) {
            const result = await client('get')(url).set('Authorization', `Bearer ${publicToken}`);
            expect([401, 403]).toContain(result.status);
        }
        const result = await request(app).post('/api/studios/studio-a/users')
            .set('Authorization', `Bearer ${publicToken}`)
            .send({ name: 'Intruso', email: 'intruder@test.invalid', password: credentials.password, role: 'ADMIN' });
        expect([401, 403]).toContain(result.status);
        expect(await prisma.user.findUnique({ where: { email: 'intruder@test.invalid' } })).toBeNull();
    });

    it('conserva la creación de usuarios del estudio por un administrador autenticado', async () => {
        const result = await request(app).post('/api/studios/studio-a/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Abogada', email: 'lawyer@test.invalid', password: credentials.password, role: 'LAWYER' });
        expect(result.status).toBe(201);
        const user = await prisma.user.findUnique({ where: { email: 'lawyer@test.invalid' } });
        expect(user).toMatchObject({ role: 'LAWYER', studioId: 'studio-a' });
    });

    it('rechaza un email duplicado sin modificar la cuenta existente', async () => {
        expect((await register({})).status).toBe(400);
        expect(await prisma.user.count({ where: { email: credentials.email } })).toBe(1);
    });

    it('permite iniciar sesión y rechaza contraseñas incorrectas o cuerpos inválidos', async () => {
        const result = await request(app).post('/api/auth/login').send(credentials);
        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({ role: 'OPERATOR', studioId: null });
        expect((await request(app).post('/api/auth/login').send({ ...credentials, password: 'incorrect' })).status).toBe(401);
        expect((await request(app).post('/api/auth/login').send({ email: {}, password: [] })).status).toBe(400);
    });

    it('conserva la sesión tras un cambio inválido y revoca todas las sesiones anteriores tras uno válido', async () => {
        const saved = await prisma.user.findUnique({ where: { email: credentials.email } });
        const me = token => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        const legacyToken = jwt.sign({ id: saved.id }, process.env.JWT_SECRET);
        const otherSession = await request(app).post('/api/auth/login').send(credentials);
        expect(otherSession.status).toBe(200);
        expect((await me(legacyToken)).status).toBe(200);
        const change = newPassword => request(app).put('/api/auth/change-password')
            .set('Authorization', `Bearer ${publicToken}`)
            .send({ currentPassword: credentials.password, newPassword });
        expect((await change('123')).status).toBe(400);
        expect((await prisma.user.findUnique({ where: { id: saved.id } })).password).toBe(saved.password);
        expect((await me(publicToken)).status).toBe(200);
        expect((await change('updated-password-456')).status).toBe(200);
        const updated = await prisma.user.findUnique({ where: { id: saved.id } });
        expect(await bcrypt.compare('updated-password-456', updated.password)).toBe(true);
        for (const token of [publicToken, legacyToken, otherSession.body.token]) {
            expect((await me(token)).status).toBe(401);
        }
        expect((await request(app).post('/api/auth/login').send(credentials)).status).toBe(401);
        const fresh = await request(app).post('/api/auth/login').send({ ...credentials, password: 'updated-password-456' });
        expect(fresh.status).toBe(200);
        expect((await me(fresh.body.token)).status).toBe(200);
        expect((await me(adminToken)).status).toBe(200);
    });

    it('bloquea el estudio suspendido y exige una nueva sesión al reactivarlo', async () => {
        await prisma.studio.create({ data: { id: 'studio-b', name: 'Estudio B', cuit: 'test-suspension' } });
        const password = await bcrypt.hash(credentials.password, 10);
        await prisma.user.createMany({ data: [
            { id: 'platform', name: 'Plataforma', email: 'platform@test.invalid', password, role: 'SUPER_ADMIN' },
            { id: 'lawyer-b', name: 'Abogada B', email: 'lawyer-b@test.invalid', password, role: 'LAWYER', studioId: 'studio-b' },
        ] });
        const platform = jwt.sign({ id: 'platform' }, process.env.JWT_SECRET);
        const login = email => request(app).post('/api/auth/login').send({ email, password: credentials.password });
        const me = token => request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
        const status = (value, token = platform) => request(app).put('/api/studios/studio-a/status')
            .set('Authorization', `Bearer ${token}`).send({ status: value });

        const active = await login('admin@test.invalid');
        const otherStudio = await login('lawyer-b@test.invalid');
        const independent = await request(app).post('/api/auth/login').send({ ...credentials, password: 'updated-password-456' });
        expect(active.status).toBe(200);
        expect(otherStudio.status).toBe(200);
        expect(independent.status).toBe(200);
        expect((await status('SUSPENDED', active.body.token)).status).toBe(401);
        expect((await status('INVALID')).status).toBe(400);
        expect((await me(active.body.token)).status).toBe(200);

        expect((await status('SUSPENDED')).status).toBe(200);
        expect((await me(active.body.token)).status).toBe(403);
        const blocked = await login('admin@test.invalid');
        expect(blocked.status).toBe(403);
        expect(blocked.body).not.toHaveProperty('token');
        expect((await me(otherStudio.body.token)).status).toBe(200);
        expect((await me(independent.body.token)).status).toBe(200);
        expect((await me(platform)).status).toBe(200);

        expect((await status('ACTIVE')).status).toBe(200);
        expect((await me(active.body.token)).status).toBe(401);
        expect((await me(adminToken)).status).toBe(401);
        const reactivated = await login('admin@test.invalid');
        expect(reactivated.status).toBe(200);
        expect((await me(reactivated.body.token)).status).toBe(200);
    });

    it('crea el estudio con una invitación de un solo uso y conserva el rol y el ámbito al activarla', async () => {
        const platform = jwt.sign({ id: 'platform' }, process.env.JWT_SECRET);
        const email = 'invited@test.invalid';
        const created = await request(app).post('/api/studios').set('Authorization', `Bearer ${platform}`)
            .send({ name: 'Estudio invitado', cuit: 'test-invitation', email });
        expect(created.status).toBe(201);
        expect(created.headers['cache-control']).toBe('no-store');
        expect(created.body).not.toHaveProperty('tempPassword');
        expect(created.body.adminEmail).toBe(email);
        expect(new Date(created.body.invitation.expiresAt).getTime() - Date.now()).toBeGreaterThan(47 * 60 * 60_000);
        const record = await prisma.accountAccessLink.findFirst({ where: { user: { email } } });
        expect(record.tokenHash).not.toBe(created.body.invitation.token);

        const password = 'invited-password-123';
        const login = () => request(app).post('/api/auth/login').send({ email, password });
        const redeem = () => request(app).post('/api/auth/account-links/redeem')
            .send({ token: created.body.invitation.token, password, role: 'SUPER_ADMIN', studioId: 'studio-b' });
        expect((await login()).status).toBe(401);
        expect((await redeem()).status).toBe(200);
        expect((await redeem()).status).toBe(400);
        const authenticated = await login();
        expect(authenticated.status).toBe(200);
        expect(authenticated.body).toMatchObject({ role: 'ADMIN', studioId: created.body.studio.id });
    });

    it('emite recuperación solo desde plataforma, reemplaza enlaces y revoca la sesión anterior', async () => {
        const platform = jwt.sign({ id: 'platform' }, process.env.JWT_SECRET);
        const email = 'lawyer-b@test.invalid';
        const login = password => request(app).post('/api/auth/login').send({ email, password });
        const issue = (email, token = platform) => request(app).post('/api/auth/recovery-links')
            .set('Authorization', `Bearer ${token}`).send({ email });
        const redeem = token => request(app).post('/api/auth/account-links/redeem')
            .send({ token, password: 'recovered-password-123' });
        const old = await login(credentials.password);
        expect(old.status).toBe(200);
        expect((await issue(email, old.body.token)).status).toBe(401);
        expect((await issue('platform@test.invalid')).status).toBe(404);
        const first = await issue(email);
        expect(first.status).toBe(201);
        const second = await issue(email);
        expect(second.status).toBe(201);
        expect(second.body.token).not.toBe(first.body.token);
        expect((await redeem(first.body.token)).status).toBe(400);

        await prisma.accountAccessLink.update({ where: { userId: 'lawyer-b' }, data: { expiresAt: new Date(0) } });
        expect((await redeem(second.body.token)).status).toBe(400);
        const third = await issue(email);
        expect(third.status).toBe(201);
        const results = await Promise.all([redeem(third.body.token), redeem(third.body.token)]);
        expect(results.map(result => result.status).sort()).toEqual([200, 400]);
        expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${old.body.token}`)).status).toBe(401);
        expect((await login(credentials.password)).status).toBe(401);
        expect((await login('recovered-password-123')).status).toBe(200);
    });

    it('rechaza un enlace anterior al traslado de una cuenta a otro estudio', async () => {
        const platform = jwt.sign({ id: 'platform' }, process.env.JWT_SECRET);
        const issued = await request(app).post('/api/auth/recovery-links')
            .set('Authorization', `Bearer ${platform}`).send({ email: 'lawyer-b@test.invalid' });
        expect(issued.status).toBe(201);
        await prisma.user.update({ where: { id: 'lawyer-b' }, data: { studioId: 'studio-a' } });
        const rejected = await request(app).post('/api/auth/account-links/redeem')
            .send({ token: issued.body.token, password: 'different-password-123' });
        expect(rejected.status).toBe(400);
    });
});
