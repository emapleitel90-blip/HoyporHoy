import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let prisma, app, tokens;
const directory = mkdtempSync(path.join(tmpdir(), 'lyp-tasks-'));
const previousUrl = process.env.DATABASE_URL;
const previousSecret = process.env.JWT_SECRET;
const people = [
    { id: 'admin', role: 'ADMIN', studioId: 'a' },
    { id: 'lawyer', role: 'LAWYER', studioId: 'a' },
    { id: 'operator', role: 'OPERATOR', studioId: 'a' },
    { id: 'other', role: 'LAWYER', studioId: 'b' },
    { id: 'inactive', role: 'LAWYER', studioId: 'a', deletedAt: new Date() },
    { id: 'solo', role: 'LAWYER', studioId: null },
    { id: 'solo2', role: 'LAWYER', studioId: null },
    { id: 'super', role: 'SUPER_ADMIN', studioId: null },
];
const auth = (method, url, user = 'admin', body) => {
    const req = request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
    return body === undefined ? req : req.send(body);
};
const payload = { title: 'Preparar escrito', instructions: 'Revisar antecedentes', assigneeId: 'operator', reviewerId: 'lawyer' };
const create = async (body = {}, caseId = 'case-a', user = 'admin') => {
    const response = await auth('post', `/api/tasks/case/${caseId}`, user, { ...payload, ...body });
    expect(response.status).toBe(201);
    return response.body;
};
const runSql = async (sql) => {
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
        await prisma.$executeRawUnsafe(statement);
    }
};

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    // Build existing tables, seed records, then apply the actual new migration.
    // Derive the baseline without Task tables so this remains repeatable after committing.
    const schemaSql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    const baseline = schemaSql.split(';').filter(statement =>
        !/CREATE (?:TABLE "(?:Task|TaskEvent)"|(?:UNIQUE )?INDEX "(?:Task|TaskEvent)_)/.test(statement)
    ).join(';');
    await runSql(baseline);
    for (const id of ['a', 'b']) await prisma.studio.create({ data: { id, name: `Estudio ${id}`, cuit: `test-${id}` } });
    for (const user of people) await prisma.user.create({ data: { ...user, name: user.id, email: `${user.id}@test.invalid`, password: 'unused' } });
    for (const [id, studioId, createdById] of [['case-a', 'a', 'admin'], ['case-b', 'b', 'other'], ['solo-case', null, 'solo']]) {
        await prisma.case.create({ data: { id, title: id, caseNumber: id, studioId, createdById } });
    }
    await runSql(readFileSync('prisma/migrations/20261016000000_add_tasks_review/migration.sql', 'utf8'));
    await runSql(readFileSync('prisma/migrations/20261028050000_task_writing_versions/migration.sql', 'utf8'));
    app = express();
    app.use(express.json());
    app.use('/api/tasks', (await import('../routes/taskRoutes.js')).default);
    app.use('/api/cases', (await import('../routes/caseRoutes.js')).default);
    app.use('/api/studios', (await import('../routes/studioRoutes.js')).default);
    tokens = Object.fromEntries(people.map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
}, 30000);

afterAll(async () => {
    await prisma?.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    // Verify the generated deletion target is a direct child of the intended temp root.
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-tasks-')) {
        throw new Error('Unexpected test directory');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Tareas: migración y ciclo de revisión con SQLite real', () => {
    it('conserva la versión entregada y rechaza revisar una entrega anterior', async () => {
        const writing = await prisma.writing.create({ data: { caseId: 'case-a', requestId: randomUUID(), createdById: 'operator', createdByName: 'operator',
            versions: { create: { number: 1, previousVersion: 0, requestId: randomUUID(), title: 'Escrito', content: 'Original', notes: '', createdById: 'operator', createdByName: 'operator' } } }, include: { versions: true } });
        const task = await create({ requiresWriting: true });
        await auth('put', `/api/tasks/${task.id}/start`, 'operator', {});
        expect((await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Sin versión', requestId: randomUUID() })).status).toBe(400);
        const delivery = { notes: 'Versión uno', writingVersionId: writing.versions[0].id, requestId: randomUUID() };
        const first = await auth('put', `/api/tasks/${task.id}/submit`, 'operator', delivery);
        expect(first.status).toBe(200);
        const submission = first.body.events.find(event => event.requestId === delivery.requestId);
        expect(submission.writingVersion.number).toBe(1);
        expect((await auth('put', `/api/tasks/${task.id}/submit`, 'operator', delivery)).status).toBe(200);
        const correction = { decision: 'REVISION_REQUESTED', notes: 'Corregir texto', submissionId: submission.id, requestId: randomUUID() };
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', correction)).status).toBe(200);
        await auth('put', `/api/tasks/${task.id}/start`, 'operator', {});
        const secondVersion = await prisma.writingVersion.create({ data: { writingId: writing.id, number: 2, previousVersion: 1, requestId: randomUUID(), title: 'Escrito', content: 'Corregido', notes: 'Corrección', createdById: 'operator', createdByName: 'operator' } });
        const second = await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Versión dos', writingVersionId: secondVersion.id, requestId: randomUUID() });
        const latest = second.body.events.filter(event => event.action === 'SUBMITTED').at(-1);
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', { decision: 'APPROVED', submissionId: submission.id, requestId: randomUUID() })).status).toBe(409);
        const approval = { decision: 'APPROVED', submissionId: latest.id, requestId: randomUUID() };
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', approval)).status).toBe(200);
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', approval)).status).toBe(200);
        const saved = await prisma.taskEvent.findMany({ where: { taskId: task.id, action: 'APPROVED' } });
        expect(saved).toHaveLength(1);
        expect(saved[0].writingVersionId).toBe(secondVersion.id);
        expect(saved[0].reviewedSubmissionId).toBe(latest.id);
    });
    it('vuelve a comprobar el rol del revisor dentro de la transacción', async () => {
        const task = await create();
        await auth('put', `/api/tasks/${task.id}/start`, 'operator', {});
        await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Listo para revisar' });
        const transaction = prisma.$transaction.bind(prisma);
        const spy = vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (...args) => {
            await prisma.user.update({ where: { id: 'lawyer' }, data: { role: 'OPERATOR' } });
            return transaction(...args);
        });
        try {
            const result = await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', { decision: 'APPROVED' });
            expect(result.status).toBe(403);
            expect((await prisma.task.findUnique({ where: { id: task.id } })).status).toBe('SUBMITTED');
        } finally {
            spy.mockRestore();
            await prisma.user.update({ where: { id: 'lawyer' }, data: { role: 'LAWYER' } });
        }
    });
    it('conserva los expedientes y usuarios existentes al migrar', async () => {
        expect(await prisma.case.count()).toBe(3);
        expect(await prisma.user.count()).toBe(8);
    });

    it('exige autenticación y rechaza cuentas inactivas', async () => {
        expect((await request(app).get('/api/tasks/my-tasks')).status).toBe(401);
        expect((await auth('get', '/api/tasks/my-tasks', 'inactive')).status).toBe(401);
    });

    it('completa inicio, avance, entrega, correcciones, nueva entrega y aprobación con historial', async () => {
        const task = await create({ dueDate: '2026-11-01T12:00:00.000Z' });
        expect(task.status).toBe('PENDING');
        expect(task.events[0]).toMatchObject({ action: 'CREATED', userId: 'admin' });
        expect(task.assignee).not.toHaveProperty('password');
        for (const [op, user, body, status] of [
            ['start', 'operator', {}, 'IN_PROGRESS'],
            ['progress', 'operator', { notes: 'Antecedentes revisados' }, 'IN_PROGRESS'],
            ['submit', 'operator', { notes: 'Escrito listo' }, 'SUBMITTED'],
            ['review', 'lawyer', { decision: 'REVISION_REQUESTED', notes: 'Agregar prueba' }, 'REVISION_REQUESTED'],
            ['start', 'operator', {}, 'IN_PROGRESS'],
            ['submit', 'operator', { notes: 'Prueba agregada' }, 'SUBMITTED'],
            ['review', 'lawyer', { decision: 'APPROVED' }, 'APPROVED'],
        ]) {
            const response = await auth('put', `/api/tasks/${task.id}/${op}`, user, body);
            expect(response.status).toBe(200);
            expect(response.body.status).toBe(status);
        }
        const result = await auth('get', `/api/tasks/${task.id}`, 'operator');
        expect(result.body.events).toHaveLength(8);
        expect(result.body.events.map(event => event.action)).toEqual([
            'CREATED', 'STARTED', 'PROGRESS_RECORDED', 'SUBMITTED', 'REVISION_REQUESTED', 'STARTED', 'SUBMITTED', 'APPROVED',
        ]);
        expect(result.body.events[4].notes).toBe('Agregar prueba');
        expect((await auth('put', `/api/tasks/${task.id}/start`, 'operator', {})).status).toBe(409);
    });

    it('solo permite avanzar al responsable y revisar al revisor designado', async () => {
        const task = await create();
        expect((await auth('put', `/api/tasks/${task.id}/start`, 'admin', {})).status).toBe(403);
        await auth('put', `/api/tasks/${task.id}/start`, 'operator', {});
        await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Listo' });
        for (const user of ['operator', 'admin', 'super']) {
            expect((await auth('put', `/api/tasks/${task.id}/review`, user, { decision: 'APPROVED' })).status).toBe(403);
        }
        expect(await prisma.taskEvent.count({ where: { taskId: task.id } })).toBe(3);
    });

    it('rechaza transiciones fuera de orden y notas obligatorias ausentes', async () => {
        const task = await create();
        expect((await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Prematuro' })).status).toBe(409);
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', { decision: 'APPROVED' })).status).toBe(409);
        await auth('put', `/api/tasks/${task.id}/start`, 'operator', {});
        expect((await auth('put', `/api/tasks/${task.id}/progress`, 'operator', { notes: ' ' })).status).toBe(400);
        expect((await auth('put', `/api/tasks/${task.id}/submit`, 'operator', {})).status).toBe(400);
        await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Listo' });
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', { decision: 'REVISION_REQUESTED' })).status).toBe(400);
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', { decision: 'arbitrary' })).status).toBe(400);
        expect(await prisma.taskEvent.count({ where: { taskId: task.id } })).toBe(3);
    });

    it.each([
        { title: ' ' }, { title: {} }, { title: 'x'.repeat(201) }, { instructions: [] },
        { assigneeId: 'other' }, { assigneeId: 'inactive' }, { assigneeId: 'missing' },
        { assigneeId: {} }, { reviewerId: 'operator' }, { reviewerId: 'inactive' },
        { reviewerId: 'other' }, { reviewerId: 'solo' }, { assigneeId: 'lawyer' },
        { dueDate: 'bad-date' }, { dueDate: 42 },
    ])('valida datos y participantes: %j', async (invalid) => {
        const count = await prisma.task.count();
        expect((await auth('post', '/api/tasks/case/case-a', 'admin', { ...payload, ...invalid })).status).toBe(400);
        expect(await prisma.task.count()).toBe(count);
    });

    it('aísla lecturas, creación y acciones entre estudios y expedientes independientes', async () => {
        const task = await create();
        for (const user of ['other', 'solo', 'solo2']) {
            expect((await auth('get', '/api/tasks/case/case-a', user)).status).toBe(404);
            expect((await auth('get', `/api/tasks/${task.id}`, user)).status).toBe(404);
            expect((await auth('post', '/api/tasks/case/case-a', user, payload)).status).toBe(404);
            expect((await auth('put', `/api/tasks/${task.id}/start`, user, {})).status).toBe(404);
        }
        expect((await auth('get', `/api/tasks/${task.id}`, 'super')).status).toBe(200);
        expect((await auth('get', '/api/tasks/case/missing')).status).toBe(404);
    });

    it('limita las tareas independientes al titular, incluso para SUPER_ADMIN', async () => {
        const task = await create({ assigneeId: 'solo', reviewerId: 'solo' }, 'solo-case', 'solo');
        expect((await auth('get', `/api/tasks/${task.id}`, 'solo2')).status).toBe(404);
        expect((await auth('post', '/api/tasks/case/solo-case', 'super', { ...payload, assigneeId: 'solo2', reviewerId: 'solo' })).status).toBe(400);
        await auth('put', `/api/tasks/${task.id}/start`, 'solo', {});
        await auth('put', `/api/tasks/${task.id}/submit`, 'solo', { notes: 'Terminado' });
        expect((await auth('put', `/api/tasks/${task.id}/review`, 'solo', { decision: 'APPROVED' })).status).toBe(200);
    });

    it('filtra bandejas personales y pendientes de revisión por usuario y estado', async () => {
        const task = await create();
        expect((await auth('get', '/api/tasks/my-tasks', 'operator')).body.some(item => item.id === task.id)).toBe(true);
        expect((await auth('get', '/api/tasks/my-tasks', 'lawyer')).body.some(item => item.id === task.id)).toBe(false);
        await auth('put', `/api/tasks/${task.id}/start`, 'operator', {});
        await auth('put', `/api/tasks/${task.id}/submit`, 'operator', { notes: 'Listo' });
        expect((await auth('get', '/api/tasks/to-review', 'lawyer')).body.map(item => item.id)).toContain(task.id);
        expect((await auth('get', '/api/tasks/to-review', 'admin')).body).toEqual([]);
        await auth('put', `/api/tasks/${task.id}/review`, 'lawyer', { decision: 'APPROVED' });
        expect((await auth('get', '/api/tasks/my-tasks', 'operator')).body.map(item => item.id)).not.toContain(task.id);
        expect((await auth('get', '/api/tasks/to-review', 'lawyer')).body.map(item => item.id)).not.toContain(task.id);
    });

    it('oculta tareas de casos eliminados y de usuarios trasladados a otro estudio', async () => {
        const task = await create();
        await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'b' } });
        expect((await auth('get', '/api/tasks/my-tasks', 'operator')).body).toEqual([]);
        expect((await auth('put', `/api/tasks/${task.id}/start`, 'operator', {})).status).toBe(404);
        await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'a' } });
        await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: new Date() } });
        expect((await auth('get', `/api/tasks/${task.id}`, 'super')).status).toBe(404);
        expect((await auth('get', '/api/tasks/my-tasks', 'operator')).body).toEqual([]);
        await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: null } });
    });
});

describe('Asignación de responsables del expediente', () => {
    it('lista integrantes activos para operadores del mismo estudio y bloquea otros estudios', async () => {
        const response = await auth('get', '/api/studios/a/users', 'operator');
        expect(response.status).toBe(200);
        expect(response.body.map(user => user.id).sort()).toEqual(['admin', 'lawyer', 'operator']);
        expect(response.body[0]).not.toHaveProperty('password');
        expect(response.body[0]).not.toHaveProperty('lastLogin');
        expect((await auth('get', '/api/studios/b/users', 'operator')).status).toBe(403);
    });

    it('asigna, conserva al editar otros campos y permite quitar responsable', async () => {
        const created = await auth('post', '/api/cases', 'admin', { title: 'Nuevo', studioId: 'b', assignedLawyerId: 'lawyer' });
        expect(created.status).toBe(201);
        expect(created.body.studioId).toBe('a');
        expect(created.body.assignedLawyer.id).toBe('lawyer');
        const url = `/api/cases/${created.body.id}`;
        expect((await auth('put', url, 'admin', { title: 'Editado' })).body.assignedLawyerId).toBe('lawyer');
        expect((await auth('put', url, 'admin', { assignedLawyerId: null })).body.assignedLawyerId).toBeNull();
        expect((await auth('put', url, 'admin', { assignedLawyerId: 'other' })).status).toBe(400);
        expect((await auth('put', url, 'other', { assignedLawyerId: 'other' })).status).toBe(403);
    });

    it.each(['other', 'inactive', 'operator', 'missing'])('rechaza responsable inválido al crear: %s', async (assignedLawyerId) => {
        expect((await auth('post', '/api/cases', 'admin', { title: 'Inválido', assignedLawyerId })).status).toBe(400);
    });

    it('no asigna otro independiente ni un miembro de estudio a un expediente sin estudio', async () => {
        for (const assignedLawyerId of ['solo2', 'lawyer']) {
            expect((await auth('post', '/api/cases', 'solo', { title: 'Privado', assignedLawyerId })).status).toBe(400);
            expect((await auth('put', '/api/cases/solo-case', 'super', { assignedLawyerId })).status).toBe(400);
        }
        expect((await auth('put', '/api/cases/solo-case', 'solo', { assignedLawyerId: 'solo' })).body.assignedLawyerId).toBe('solo');
    });

    it('conserva una asignación histórica inactiva al editar sin reasignar', async () => {
        const record = await prisma.case.create({ data: {
            title: 'Asignación histórica', caseNumber: 'historic', studioId: 'a', createdById: 'admin', assignedLawyerId: 'inactive',
        } });
        const response = await auth('put', `/api/cases/${record.id}`, 'admin', { title: 'Actualizado', assignedLawyerId: 'inactive' });
        expect(response.status).toBe(200);
        expect(response.body.assignedLawyerId).toBe('inactive');
        expect((await auth('put', `/api/cases/${record.id}`, 'admin', { assignedLawyerId: '' })).body.assignedLawyerId).toBeNull();
    });
});
