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

    it('rechaza una nueva contraseña corta sin cambiar el hash y permite una contraseña válida', async () => {
        const saved = await prisma.user.findUnique({ where: { email: credentials.email } });
        const change = newPassword => request(app).put('/api/auth/change-password')
            .set('Authorization', `Bearer ${publicToken}`)
            .send({ currentPassword: credentials.password, newPassword });
        expect((await change('123')).status).toBe(400);
        expect((await prisma.user.findUnique({ where: { id: saved.id } })).password).toBe(saved.password);
        expect((await change('updated-password-456')).status).toBe(200);
        const updated = await prisma.user.findUnique({ where: { id: saved.id } });
        expect(await bcrypt.compare('updated-password-456', updated.password)).toBe(true);
    });
});
