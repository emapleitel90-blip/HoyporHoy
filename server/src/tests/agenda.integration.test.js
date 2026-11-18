import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-agenda-'));
const previous = { DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET };
let db, app, tokens;
const auth = (method, url, user = 'a', body) => {
    const req = request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
    return body === undefined ? req : req.send(body);
};
const range = '/api/agenda?start=2026-11-01&end=2026-12-01';
const payload = { title: 'Llamar al cliente', dueDate: '2026-11-06', priority: 'HIGH' };
beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    db = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
    for (const id of ['a', 'b']) await db.studio.create({ data: { id, name: id, cuit: id } });
    const users = [
        { id: 'a', role: 'ADMIN', studioId: 'a' }, { id: 'worker', role: 'OPERATOR', studioId: 'a' },
        { id: 'lawyer', role: 'LAWYER', studioId: 'a' }, { id: 'b', role: 'ADMIN', studioId: 'b' },
        { id: 'solo', role: 'LAWYER' }, { id: 'solo2', role: 'LAWYER' }, { id: 'inactive', role: 'LAWYER', studioId: 'a', deletedAt: new Date() },
    ];
    for (const user of users) await db.user.create({ data: { ...user, name: user.id, email: `${user.id}@test.invalid`, password: 'unused' } });
    tokens = Object.fromEntries(users.map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    for (const [id, studioId, createdById] of [['a', 'a', 'a'], ['b', 'b', 'b'], ['solo', null, 'solo']]) await db.case.create({ data: {
        id: `case-${id}`, title: id, caseNumber: id, studioId, createdById,
        details: JSON.stringify({ proximaAudiencia: '2026-11-06' }),
    } });
    app = express(); app.use(express.json());
    app.use('/api/agenda', (await import('../routes/agendaRoutes.js')).default);
    app.use('/api/tasks', (await import('../routes/taskRoutes.js')).default);
});
afterAll(async () => {
    await db?.$disconnect();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-agenda-')) throw new Error('Unexpected test directory');
    rmSync(directory, { recursive: true, force: true });
});

describe('Cronograma con persistencia y aislamiento reales', () => {
    it('crea sin expediente, consulta por día argentino, edita, reprograma, completa y reabre con historial', async () => {
        const created = await auth('post', '/api/agenda/tasks', 'solo', payload);
        expect(created.status).toBe(201);
        expect(created.body.case).toBeNull();
        expect(created.body.date).toBe('2026-11-06T03:00:00.000Z');
        const id = created.body.sourceId, url = `/api/agenda/tasks/${id}`;
        expect((await auth('get', range, 'solo2')).body.activities.some(item => item.sourceId === id)).toBe(false);
        const edited = await auth('put', url, 'solo', { ...payload, title: 'Llamar mañana', dueDate: '2026-11-07T23:30:00-03:00', updatedAt: created.body.updatedAt });
        expect(edited.status).toBe(200);
        expect((await auth('put', url, 'solo', { ...payload, updatedAt: created.body.updatedAt })).status).toBe(409);
        expect((await auth('get', '/api/agenda?start=2026-11-07&end=2026-11-08', 'solo')).body.activities.some(item => item.sourceId === id)).toBe(true);
        expect((await auth('get', '/api/agenda?start=2026-11-08&end=2026-11-09', 'solo')).body.activities.some(item => item.sourceId === id)).toBe(false);
        const done = await auth('put', url, 'solo', { completed: true, updatedAt: edited.body.updatedAt });
        expect(done.status).toBe(200); expect(done.body.completed).toBe(true);
        const reopened = await auth('put', url, 'solo', { completed: false, updatedAt: done.body.updatedAt });
        expect(reopened.status).toBe(200); expect(reopened.body.status).toBe('PENDING');
        const saved = await db.task.findUnique({ where: { id }, include: { events: true } });
        expect(saved.title).toBe('Llamar mañana'); expect(saved.events).toHaveLength(4);
    });
    it('rechaza expedientes, responsables, lecturas y cambios de otro estudio y no confía en studioId', async () => {
        expect((await auth('post', '/api/agenda/tasks', 'a', { ...payload, caseId: 'case-b' })).status).toBe(404);
        for (const assigneeId of ['b', 'inactive', 'solo']) expect((await auth('post', '/api/agenda/tasks', 'a', { ...payload, assigneeId })).status).toBe(400);
        expect((await auth('post', '/api/agenda/tasks', 'worker', { ...payload, assigneeId: 'a' })).status).toBe(403);
        const created = await auth('post', '/api/agenda/tasks', 'a', { ...payload, studioId: 'b', caseId: 'case-a' });
        expect(created.status).toBe(201);
        const stored = await db.task.findUnique({ where: { id: created.body.sourceId } });
        expect(stored.studioId).toBe('a');
        const other = await auth('get', range, 'b');
        expect(other.body.activities.some(item => item.id === created.body.id)).toBe(false);
        expect((await auth('put', `/api/agenda/tasks/${stored.id}`, 'b', { ...payload, updatedAt: created.body.updatedAt })).status).toBe(404);
        expect((await auth('get', '/api/agenda/options', 'worker')).body.users.map(user => user.id)).toEqual(['worker']);
    });
    it('permite asignación de administradores y solo el responsable completa una tarea simple', async () => {
        const created = await auth('post', '/api/agenda/tasks', 'a', { ...payload, assigneeId: 'worker' });
        expect(created.status).toBe(201);
        expect(created.body.canComplete).toBe(false);
        const url = `/api/agenda/tasks/${created.body.sourceId}`;
        expect((await auth('put', url, 'a', { completed: true, updatedAt: created.body.updatedAt })).status).toBe(403);
        expect((await auth('get', range, 'worker')).body.activities.find(item => item.id === created.body.id).canComplete).toBe(true);
        expect((await auth('put', url, 'worker', { completed: true, updatedAt: created.body.updatedAt })).status).toBe(200);
    });
    it('conserva el circuito de revisión de las tareas del expediente', async () => {
        const task = await db.task.create({ data: { title: 'Escrito con revisión', caseId: 'case-a', assigneeId: 'worker', reviewerId: 'lawyer', createdById: 'a', dueDate: new Date('2026-11-06T12:00:00Z'), requiresWriting: true } });
        const result = await auth('get', range, 'worker');
        const item = result.body.activities.find(activity => activity.sourceId === task.id);
        expect(item.reviewRequired).toBe(true); expect(item.canComplete).toBe(false);
        expect((await auth('put', `/api/agenda/tasks/${task.id}`, 'worker', { completed: true, updatedAt: task.updatedAt.toISOString() })).status).toBe(403);
        expect((await auth('put', `/api/agenda/tasks/${task.id}`, 'b', { ...payload, updatedAt: task.updatedAt.toISOString() })).status).toBe(404);
        await db.task.update({ where: { id: task.id }, data: { status: 'SUBMITTED' } });
        const current = await db.task.findUnique({ where: { id: task.id } });
        expect((await auth('put', `/api/agenda/tasks/${task.id}`, 'a', { ...payload, updatedAt: current.updatedAt.toISOString() })).status).toBe(409);
    });
    it('incluye plazos, estados completados y audiencias del formulario sin filtrar datos de otros estudios', async () => {
        await db.deadline.create({ data: { id: 'deadline-a', title: 'Plazo real', caseId: 'case-a', dueDate: new Date('2026-11-06T03:00:00Z'), isCompleted: true } });
        await db.deadline.create({ data: { id: 'deadline-b', title: 'Audiencia privada', caseId: 'case-b', dueDate: new Date('2026-11-06T03:00:00Z') } });
        const { body } = await auth('get', range);
        expect(body.activities.find(item => item.id === 'deadline:deadline-a').completed).toBe(true);
        expect(body.activities.some(item => item.id === 'deadline:deadline-b')).toBe(false);
        expect(body.activities.find(item => item.id === 'hearing:case-a').kind).toBe('HEARING');
        expect(body.activities.some(item => item.id === 'hearing:case-b')).toBe(false);
        await db.case.update({ where: { id: 'case-a' }, data: { deletedAt: new Date() } });
        const deleted = await auth('get', range);
        expect(deleted.body.activities.some(item => item.case?.id === 'case-a')).toBe(false);
    });
    it('valida rangos, prioridades y fechas y requiere autenticación', async () => {
        expect((await request(app).get(range)).status).toBe(401);
        for (const suffix of ['start=2026-11-01&end=2027-02-01', 'start=2026-02-30&end=2026-03-01', 'start=2026-11-06&end=2026-11-01']) expect((await auth('get', `/api/agenda?${suffix}`)).status).toBe(400);
        for (const body of [{ dueDate: '2026-02-30' }, { dueDate: '2026-11-06T12:00' }, { priority: 'INVALID' }, { title: '' }]) expect((await auth('post', '/api/agenda/tasks', 'a', { ...payload, ...body })).status).toBe(400);
    });
});
