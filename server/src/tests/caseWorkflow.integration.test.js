import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-case-workflow-'));
const previous = { DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET };
let db, app, tokens;
const auth = (method, url, user = 'a', body) => {
    const req = request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
    return body === undefined ? req : req.send(body);
};
const sql = async text => { for (const part of text.split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(part); };
const next = id => `/api/cases/${id}/next-action`;
const duplicates = params => `/api/cases/check-duplicates?${new URLSearchParams(params)}`;

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}?connection_limit=1`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    db = (await import('../utils/prismaClient.js')).default;
    // Derive the actual schema immediately preceding the new migration.
    const beforeSchema = readFileSync('prisma/schema.prisma', 'utf8')
        .replace(/(model Case \{[\s\S]*?)^  editVersion[^\n]*\n/m, '$1')
        .split('\n').filter(line => !/\bnextAction(?:Id|For)?\b/.test(line)).join('\n');
    const schemaPath = path.join(directory, 'before.prisma'); writeFileSync(schemaPath, beforeSchema);
    await sql(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', schemaPath, '--script'], { encoding: 'utf8' }));
    for (const id of ['a', 'b']) await db.studio.create({ data: { id, name: id, cuit: id } });
    const users = [{ id: 'a', role: 'ADMIN', studioId: 'a' }, { id: 'worker', role: 'OPERATOR', studioId: 'a' },
        { id: 'lawyer', role: 'LAWYER', studioId: 'a' }, { id: 'b', role: 'ADMIN', studioId: 'b' },
        { id: 'solo', role: 'LAWYER' }, { id: 'solo2', role: 'LAWYER' }, { id: 'super', role: 'SUPER_ADMIN' },
        { id: 'inactive', role: 'LAWYER', studioId: 'a', deletedAt: new Date() }];
    for (const user of users) await db.user.create({ data: { ...user, name: user.id, email: `${user.id}@test.invalid`, password: 'unused' } });
    tokens = Object.fromEntries(users.map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    for (const [id, studioId, createdById, clientName, details] of [
        ['case-a', 'a', 'a', 'José Pérez', { dni: '20.123.456', nroExpediente: 'EXP 123/2026', contraparte: 'Empresa Sur S.A.' }],
        ['case-a2', 'a', 'a', 'Empresa Sur SA', { dni: '30-12345678-1' }],
        ['case-b', 'b', 'b', 'José Pérez', { dni: '20.123.456', nroExpediente: 'EXP 123/2026' }],
        ['case-solo', null, 'solo', 'José Pérez', { dni: '20.123.456' }],
        ['case-solo2', null, 'solo2', 'José Pérez', { dni: '20.123.456' }],
    ]) await db.$executeRawUnsafe('INSERT INTO "Case" ("id", "caseNumber", "title", "studioId", "createdById", "clientName", "details", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)', id, id, id, studioId, createdById, clientName, JSON.stringify(details));
    await db.task.create({ data: { id: 'historical', title: 'Tarea previa', caseId: 'case-a', assigneeId: 'worker', reviewerId: 'lawyer', createdById: 'a',
        events: { create: { userId: 'a', action: 'CREATED', toStatus: 'PENDING' } } } });
    await sql(readFileSync('prisma/migrations/20261106010000_case_next_action/migration.sql', 'utf8'));
    await sql(readFileSync('prisma/migrations/20261113040000_case_edit_version/migration.sql', 'utf8'));
    app = express(); app.use(express.json());
    app.use('/api/cases', (await import('../routes/caseRoutes.js')).default);
    app.use('/api/agenda', (await import('../routes/agendaRoutes.js')).default);
});
afterAll(async () => {
    await db?.$disconnect();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-case-workflow-')) throw new Error('Unexpected test directory');
    rmSync(directory, { recursive: true, force: true });
});

describe('Próxima acción y coincidencias entre expedientes', () => {
    it('migra sin perder expedientes, tareas ni eventos', async () => {
        expect(await db.case.count()).toBe(5);
        const task = await db.task.findUnique({ where: { id: 'historical' }, include: { events: true } });
        expect(task.title).toBe('Tarea previa'); expect(task.events).toHaveLength(1);
        expect(await db.case.findUnique({ where: { id: 'case-a' } })).toMatchObject({ nextActionId: null, editVersion: 0 });
        expect(await db.$queryRawUnsafe('PRAGMA foreign_key_check')).toEqual([]);
    });
    it('lista y abre únicamente los expedientes del estudio o del titular independiente', async () => {
        const studio = await auth('get', '/api/cases', 'a');
        expect(studio.status).toBe(200);
        expect(studio.body.map(item => item.id).sort()).toEqual(['case-a', 'case-a2']);
        expect((await auth('get', '/api/cases/case-b', 'a')).status).toBe(403);
        const independent = await auth('get', '/api/cases', 'solo');
        expect(independent.status).toBe(200);
        expect(independent.body.map(item => item.id)).toEqual(['case-solo']);
        expect((await auth('get', '/api/cases/case-solo2', 'solo')).status).toBe(403);
    });
    it('crea una tarea real, la refleja en la lista y el cronograma y conserva la cumplida al definir la siguiente', async () => {
        const initial = await auth('get', next('case-a'));
        expect(initial.status).toBe(200); expect(initial.body.nextAction).toBeNull();
        const body = { title: 'Solicitar documentación', assigneeId: 'worker', dueDate: '2026-11-10', expectedTaskId: null, studioId: 'b' };
        const created = await auth('put', next('case-a'), 'a', body);
        expect(created.status).toBe(200);
        const action = created.body.nextAction;
        expect(action).toMatchObject({ title: body.title, caseId: 'case-a', status: 'PENDING', assigneeId: 'worker', reviewerId: null });
        expect((await db.task.findUnique({ where: { id: action.id } })).studioId).toBe('a');
        expect((await auth('get', '/api/cases')).body.find(item => item.id === 'case-a').nextAction.id).toBe(action.id);
        expect((await auth('get', '/api/agenda?start=2026-11-10&end=2026-11-11', 'worker')).body.activities.some(item => item.sourceId === action.id)).toBe(true);
        const done = await auth('put', `/api/agenda/tasks/${action.id}`, 'worker', { completed: true, updatedAt: action.updatedAt });
        expect(done.status).toBe(200);
        const successor = await auth('put', next('case-a'), 'a', { ...body, title: 'Revisar documentación recibida', expectedTaskId: action.id, expectedUpdatedAt: done.body.updatedAt });
        expect(successor.status).toBe(200); expect(successor.body.nextAction.id).not.toBe(action.id);
        expect((await db.task.findUnique({ where: { id: action.id } })).status).toBe('COMPLETED');
        expect((await db.case.findUnique({ where: { id: 'case-a' } })).nextActionId).toBe(successor.body.nextAction.id);
    });
    it('detecta cambios simultáneos y conserva los datos de admisión al editar la acción', async () => {
        const { body } = await auth('get', next('case-a'));
        const original = await db.case.findUnique({ where: { id: 'case-a' } });
        const update = { title: 'Preparar demanda', assigneeId: 'worker', dueDate: '2026-11-12', expectedTaskId: body.nextAction.id, expectedUpdatedAt: body.nextAction.updatedAt };
        expect((await auth('put', next('case-a'), 'a', update)).status).toBe(200);
        expect((await auth('put', next('case-a'), 'a', update)).status).toBe(409);
        const saved = await db.case.findUnique({ where: { id: 'case-a' } });
        expect(saved.details).toBe(original.details);
        expect(await db.taskEvent.count({ where: { taskId: saved.nextActionId, action: 'NEXT_ACTION_UPDATED' } })).toBe(1);
    });

    it('guarda el asunto y la próxima acción juntos y recupera el mismo expediente al reintentar', async () => {
        const requestId = randomUUID();
        const payload = {
            requestId, title: 'Reclamo laboral', clientName: 'Cliente ficticio', studioId: 'b', priority: 'HIGH',
            nextAction: { title: 'Pedir recibos', dueDate: '2026-11-18', assigneeId: 'worker' },
        };
        const created = await auth('post', '/api/cases', 'a', payload);
        expect(created.status).toBe(201);
        expect(created.body).toMatchObject({ title: payload.title, studioId: 'a', priority: 'HIGH', nextAction: {
            title: 'Pedir recibos', assigneeId: 'worker', dueDate: '2026-11-18T03:00:00.000Z',
        } });
        const replay = await auth('post', '/api/cases', 'a', payload);
        expect(replay.status).toBe(200);
        expect(replay.body.id).toBe(created.body.id);
        expect(replay.body.nextAction.id).toBe(created.body.nextAction.id);
        expect(await db.case.count({ where: { title: payload.title } })).toBe(1);
        expect(await db.task.count({ where: { caseId: created.body.id } })).toBe(1);
        expect(await db.taskEvent.count({ where: { taskId: created.body.nextAction.id } })).toBe(1);
        const agenda = await auth('get', '/api/agenda?start=2026-11-18&end=2026-11-19', 'worker');
        expect(agenda.body.activities).toEqual(expect.arrayContaining([
            expect.objectContaining({ sourceId: created.body.nextAction.id }),
        ]));
        expect((await auth('post', '/api/cases', 'a', { ...payload, title: 'Datos distintos' })).status).toBe(409);
        expect((await auth('post', '/api/cases', 'a', { ...payload, priority: 'URGENT' })).status).toBe(409);
    });

    it('rechaza una próxima acción fuera del estudio sin crear expediente, tareas ni avisos', async () => {
        const before = await Promise.all([db.case.count(), db.task.count(), db.notification.count()]);
        const payload = {
            title: 'Reclamo de prueba', clientName: 'Cliente ficticio', requestId: randomUUID(),
            nextAction: { title: 'Pedir recibos', dueDate: '2026-11-18', assigneeId: 'b' },
        };
        expect((await auth('post', '/api/cases', 'a', payload)).status).toBe(400);
        expect(await Promise.all([db.case.count(), db.task.count(), db.notification.count()])).toEqual(before);
        expect((await auth('post', '/api/cases', 'worker', { ...payload, nextAction: { ...payload.nextAction, assigneeId: 'lawyer' } })).status).toBe(403);
        expect(await Promise.all([db.case.count(), db.task.count(), db.notification.count()])).toEqual(before);
    });
    it('restringe consulta, asignación y cambios por estudio, titular y rol', async () => {
        for (const method of ['get', 'put']) expect((await auth(method, next('case-a'), 'b', method === 'put' ? { title: 'Cruce', dueDate: '2026-11-06', assigneeId: 'b', expectedTaskId: null } : undefined)).status).toBe(404);
        expect((await auth('get', next('case-solo'), 'solo2')).status).toBe(404);
        expect((await request(app).get(next('case-a'))).status).toBe(401);
        expect((await auth('get', next('case-a'), 'inactive')).status).toBe(401);
        const base = { title: 'Siguiente paso', dueDate: '2026-11-06', expectedTaskId: null };
        expect((await auth('put', next('case-a2'), 'worker', { ...base, assigneeId: 'lawyer' })).status).toBe(403);
        for (const assigneeId of ['b', 'inactive']) expect((await auth('put', next('case-a2'), 'a', { ...base, assigneeId })).status).toBe(400);
        expect((await auth('put', next('case-solo'), 'solo', { ...base, assigneeId: 'solo' })).status).toBe(200);
        expect((await auth('put', next('case-a2'), 'worker', { ...base, assigneeId: 'worker' })).status).toBe(200);
        const action = (await auth('get', next('case-a2'), 'lawyer')).body;
        expect(action.canEdit).toBe(false);
        expect((await auth('put', next('case-a2'), 'lawyer', { ...base, assigneeId: 'lawyer', expectedTaskId: action.nextAction.id, expectedUpdatedAt: action.nextAction.updatedAt })).status).toBe(403);
    });
    it('normaliza DNI, nombre y expediente sin revelar otros estudios ni documentos del expediente', async () => {
        const result = await auth('get', duplicates({ dni: '20123456', clientName: 'Jose Perez', nroExpediente: 'exp-123/2026' }));
        expect(result.status).toBe(200); expect(result.body.matches.map(item => item.id)).toEqual(['case-a']);
        expect(result.body.matches[0].reasons).toHaveLength(3);
        expect(result.body.matches[0]).not.toHaveProperty('details');
        expect((await auth('get', duplicates({ dni: '20123456', excludeCaseId: 'case-a' }))).body.matches).toEqual([]);
        expect((await auth('get', duplicates({ dni: '20123456' }), 'solo')).body.matches.map(item => item.id)).toEqual(['case-solo']);
        expect((await auth('get', duplicates({ dni: '20123456', excludeCaseId: 'case-a' }), 'b')).status).toBe(404);
    });
    it('señala cruces cliente/contraparte y limita al ámbito del expediente incluso para el superadministrador', async () => {
        const result = await auth('get', duplicates({ contraparte: 'Empresa Sur S.A.' }));
        expect(result.body.matches.find(item => item.id === 'case-a').reasons).toContain('Coincide la contraparte');
        expect(result.body.matches.find(item => item.id === 'case-a2').reasons).toContain('La contraparte figura como consultante en otro caso');
        expect((await auth('get', duplicates({ clientName: 'Empresa Sur SA' }))).body.matches.find(item => item.id === 'case-a').reasons).toContain('El consultante figura como contraparte en otro caso');
        const scoped = await auth('get', duplicates({ dni: '20123456', excludeCaseId: 'case-b' }), 'super');
        expect(scoped.body.matches).toEqual([]);
        expect((await auth('get', duplicates({ dni: '20123456' }), 'super')).body.matches).toEqual([]);
    });
    it('omite entradas insuficientes, valida entradas y omite expedientes eliminados', async () => {
        expect((await auth('get', duplicates({ clientName: 'Ana' }))).body.matches).toEqual([]);
        expect((await auth('get', duplicates({ clientName: 'x'.repeat(201) }))).status).toBe(400);
        await db.case.update({ where: { id: 'case-a' }, data: { deletedAt: new Date() } });
        expect((await auth('get', duplicates({ dni: '20123456' }))).body.matches).toEqual([]);
        expect((await auth('get', next('case-a'))).status).toBe(404);
    });
});

describe('Prioridad de expedientes', () => {
    it('migra las prioridades históricas reconocidas y conserva los datos originales', async () => {
        const fixtures = [
            ['legacy-urgent', '{"urgencia":" Urgente (Plazos corriendo) "}', 'MEDIUM', 'URGENT'],
            ['legacy-low', '{"nivelUrgencia":"Baja","urgencia":"Alta"}', 'MEDIUM', 'LOW'],
            ['legacy-high', '{"nivelUrgencia":"Sin registrar","urgencia":"Alta"}', 'MEDIUM', 'HIGH'],
            ['legacy-explicit', '{"urgencia":"Urgente"}', 'LOW', 'LOW'],
            ['legacy-malformed', '{"urgencia":', 'MEDIUM', 'MEDIUM'],
        ];
        for (const [id, details, priority] of fixtures) {
            await db.case.create({ data: { id, title: id, caseNumber: id, details, priority, createdById: 'solo2' } });
        }

        await sql(readFileSync('prisma/migrations/20261113020000_normalize_case_priority/migration.sql', 'utf8'));

        for (const [id, details, , priority] of fixtures) {
            expect(await db.case.findUnique({ where: { id } })).toMatchObject({ details, priority });
        }
    });

    it('guarda y filtra por prioridad, y cuenta solo los urgentes abiertos del estudio', async () => {
        const payload = { title: 'Caso de prioridad', clientName: 'Cliente de prueba', score: 95 };
        const created = await auth('post', '/api/cases', 'a', { ...payload, priority: 'HIGH' });
        expect(created.status).toBe(201);
        const url = `/api/cases/${created.body.id}`;
        expect((await auth('get', '/api/cases/stats')).body.urgent).toBe(0);
        expect((await auth('put', url, 'a', { priority: 'INDEFINIDA', version: created.body.editVersion })).status).toBe(400);
        expect((await auth('get', url)).body.priority).toBe('HIGH');

        const updated = await auth('put', url, 'a', { priority: 'URGENT', version: created.body.editVersion });
        expect(updated.body.priority).toBe('URGENT');
        expect((await auth('get', url)).body.priority).toBe('URGENT');
        expect((await auth('get', '/api/cases?priority=URGENT')).body.map(item => item.id)).toEqual([created.body.id]);
        expect((await auth('get', '/api/cases?priority=URGENT', 'b')).body).toEqual([]);
        expect((await auth('get', '/api/cases?priority=INDEFINIDA')).status).toBe(400);
        expect((await auth('get', '/api/cases/stats')).body.urgent).toBe(1);

        expect((await auth('put', url, 'a', { status: 'CLOSED', version: updated.body.editVersion })).status).toBe(200);
        expect((await auth('get', '/api/cases/stats')).body.urgent).toBe(0);
    });

    it('respeta la prioridad explícita en ediciones con datos de admisión históricos', async () => {
        const details = { urgencia: 'Alta' };
        const created = await auth('post', '/api/cases', 'a', { title: 'Admisión anterior', details });
        expect(created.body.priority).toBe('HIGH');
        const url = `/api/cases/${created.body.id}`;
        const explicit = await auth('put', url, 'a', { details, priority: 'LOW', version: created.body.editVersion });
        expect(explicit.body.priority).toBe('LOW');
        const note = await auth('put', url, 'a', { details: { ...details, notas: 'Una nota' }, version: explicit.body.editVersion });
        expect(note.body.priority).toBe('LOW');
        expect((await auth('put', url, 'a', { details: { urgencia: 'Media' }, version: note.body.editVersion })).body.priority).toBe('MEDIUM');
    });
});

describe('Edición concurrente de expedientes', () => {
    it('acepta un solo cambio simultáneo, conserva el dato ganador y permite editar con la nueva versión', async () => {
        const created = await auth('post', '/api/cases', 'a', { title: 'Asunto original' });
        expect(created.status).toBe(201);
        const id = created.body.id;
        const url = `/api/cases/${id}`;
        const version = created.body.editVersion;
        const outcomes = await Promise.all([
            auth('put', url, 'a', { version, title: 'Asunto de la primera edición' }),
            auth('put', url, 'lawyer', { version, title: 'Asunto de la segunda edición' }),
        ]);
        expect(outcomes.map(result => result.status).sort()).toEqual([200, 409]);
        const saved = outcomes.find(result => result.status === 200).body;
        expect(saved.editVersion).toBe(version + 1);
        expect((await auth('get', url)).body.title).toBe(saved.title);
        expect(await db.notification.count({ where: { caseId: id, userId: 'a', title: 'Expediente actualizado' } })).toBe(1);
        const noChange = await auth('put', url, 'a', { version: saved.editVersion, title: saved.title });
        expect(noChange.status).toBe(200);
        expect(noChange.body.editVersion).toBe(saved.editVersion);
        const retried = await auth('put', url, 'a', { version: saved.editVersion, description: 'Información revisada' });
        expect(retried.body).toMatchObject({ title: saved.title, description: 'Información revisada' });
    });

    it('rechaza una versión ausente y datos inválidos sin escrituras parciales', async () => {
        const created = await auth('post', '/api/cases', 'a', { title: 'Expediente a validar' });
        const url = `/api/cases/${created.body.id}`;
        const version = created.body.editVersion;
        for (const body of [{}, { version: 'ayer' }, { version, status: 'UNKNOWN' }, { version, details: '[' }, { version, score: 1.5 }]) {
            expect((await auth('put', url, 'a', { title: 'No debe guardarse', ...body })).status).toBe(400);
        }
        expect((await auth('get', url)).body).toMatchObject({ title: 'Expediente a validar', editVersion: version });
    });
});
