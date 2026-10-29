import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-followups-'));
const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET', 'CASE_FILES_DIR'].map(key => [key, process.env[key]]));
const defaultBody = { kind: 'DOCUMENT', title: 'Recibo pendiente', ownerId: 'owner', dueDate: '2026-11-01T12:00:00.000Z' };
const pdf = Buffer.from('%PDF-1.4\nPrueba de seguimiento\n%%EOF');
let prisma, app, tokens;
const auth = (method, url, user = 'admin') => request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
const create = async (body = {}, caseId = 'case-a', user = 'admin') => {
    const response = await auth('post', `/api/follow-ups/case/${caseId}`, user).send({ ...defaultBody, ...body });
    expect(response.status).toBe(201);
    return response.body;
};
const act = (item, action, user = 'owner', body = {}) => auth('post', `/api/follow-ups/${item.id}/actions`, user).send({ action, version: item.updatedAt, ...body });
const upload = async (caseId = 'case-a', user = 'admin') => {
    const response = await auth('post', `/api/cases/${caseId}/files`, user).attach('file', pdf, { filename: 'recibo.pdf', contentType: 'application/pdf' });
    expect(response.status).toBe(201);
    return response.body;
};
const runSql = async sql => { for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement); };

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.CASE_FILES_DIR = path.join(directory, 'private-files');
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    await runSql(sql.split(';').filter(statement => !/CREATE (?:TABLE "(?:FollowUp|FollowUpEvent)"|(?:UNIQUE )?INDEX "(?:FollowUp|FollowUpEvent)_)/.test(statement)).join(';'));
    for (const id of ['a', 'b']) await prisma.studio.create({ data: { id, name: id, cuit: id } });
    for (const [id, studioId, role] of [['admin', 'a', 'ADMIN'], ['owner', 'a', 'OPERATOR'], ['colleague', 'a', 'OPERATOR'], ['lawyer', 'a', 'LAWYER'], ['other', 'b', 'LAWYER'], ['inactive', 'a', 'OPERATOR'], ['solo', null, 'LAWYER'], ['solo2', null, 'LAWYER'], ['super', null, 'SUPER_ADMIN']]) {
        await prisma.user.create({ data: { id, studioId, role, name: id, email: `${id}@test.invalid`, password: 'unused', ...(id === 'inactive' ? { deletedAt: new Date() } : {}) } });
    }
    for (const [id, studioId, createdById] of [['case-a', 'a', 'admin'], ['case-b', 'b', 'other'], ['case-solo', null, 'solo'], ['deleted', 'a', 'admin']]) {
        await prisma.case.create({ data: { id, studioId, createdById, title: id, caseNumber: id, ...(id === 'deleted' ? { deletedAt: new Date() } : {}) } });
    }
    await prisma.caseFile.create({ data: { id: 'legacy', name: 'anterior.pdf', url: 'https://storage.lyp.com/anterior.pdf', caseId: 'case-a' } });
    await prisma.task.create({ data: { id: 'existing-task', title: 'Tarea anterior', caseId: 'case-a', assigneeId: 'owner', reviewerId: 'lawyer', createdById: 'admin', events: { create: { userId: 'admin', action: 'CREATED', toStatus: 'PENDING' } } } });
    for (const name of ['Task_caseId_idx', 'Task_assigneeId_status_idx', 'Task_reviewerId_status_idx', 'TaskEvent_taskId_createdAt_idx']) await prisma.$executeRawUnsafe(`DROP INDEX "${name}"`);
    const repairSql = readFileSync('prisma/migrations/20261018000000_reconcile_task_indexes/migration.sql', 'utf8');
    await runSql(repairSql);
    await runSql(repairSql); // Already-correct installations may run the same reconciliation.
    await runSql(readFileSync('prisma/migrations/20261019000000_client_followups/migration.sql', 'utf8'));
    const diff = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    expect(diff).toContain('This is an empty migration');
    tokens = Object.fromEntries((await prisma.user.findMany()).map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    app = express(); app.use(express.json());
    app.use('/api/follow-ups', (await import('../routes/followUpRoutes.js')).default);
    app.use('/api/cases', (await import('../routes/caseRoutes.js')).default);
    app.use((await import('../middleware/errorMiddleware.js')).errorHandler);
}, 30000);
afterAll(async () => {
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-followups-')) throw new Error('Unexpected test directory');
    rmSync(directory, { recursive: true, force: true });
});

describe('Seguimiento: migración, documentación y compromisos', () => {
    it('migra sin perder expedientes, archivos ni usuarios', async () => {
        expect(await prisma.case.count()).toBe(4);
        expect(await prisma.user.count()).toBe(9);
        expect(await prisma.caseFile.count()).toBe(1);
        expect(await prisma.task.count()).toBe(1);
        expect(await prisma.taskEvent.count()).toBe(1);
    });
    it('requiere sesión y cuenta activa', async () => {
        expect((await request(app).get('/api/follow-ups/mine')).status).toBe(401);
        expect((await auth('get', '/api/follow-ups/mine', 'inactive')).status).toBe(401);
    });
    it('registra recepción, corrección, nueva recepción y verificación con historial', async () => {
        let item = await create();
        const file = await upload();
        expect(item.events[0]).toMatchObject({ action: 'CREATED', userId: 'admin', toStatus: 'PENDING' });
        for (const [action, user, body, status] of [
            ['RECEIVE', 'owner', { fileId: file.id }, 'RECEIVED'],
            ['REQUEST_REVISION', 'lawyer', { notes: 'Falta una página' }, 'REVISION_REQUESTED'],
            ['RECEIVE', 'owner', { fileId: file.id, notes: 'Archivo revisado con el cliente' }, 'RECEIVED'],
            ['VERIFY', 'lawyer', { notes: 'Comprobado' }, 'VERIFIED'],
        ]) {
            const result = await act(item, action, user, body);
            expect(result.status).toBe(200); expect(result.body.status).toBe(status); item = result.body;
        }
        expect(item.file.id).toBe(file.id);
        expect(item.events.map(event => event.action)).toEqual(['CREATED', 'RECEIVE', 'REQUEST_REVISION', 'RECEIVE', 'VERIFY']);
        expect(item.events[2].notes).toBe('Falta una página');
        expect(item.owner).not.toHaveProperty('password');
        expect((await auth('get', '/api/follow-ups/mine', 'owner')).body.map(record => record.id)).not.toContain(item.id);
    });
    it('permite registrar y resolver un bloqueo sin cambiar el estado procesal', async () => {
        const item = await create({ kind: 'BLOCKER', title: 'Esperando respuesta del cliente', dueDate: null });
        const result = await act(item, 'COMPLETE', 'owner', { notes: 'Cliente respondió' });
        expect(result.status).toBe(200); expect(result.body.status).toBe('COMPLETED');
        expect((await prisma.case.findUnique({ where: { id: 'case-a' } })).status).toBe('OPEN');
        expect((await act(result.body, 'REOPEN', 'owner', { notes: 'Hace falta una nueva respuesta' })).body.status).toBe('PENDING');
    });
    it('registra cumplimiento de compromisos y los retira de la bandeja', async () => {
        const item = await create({ kind: 'COMMITMENT', title: 'Confirmar datos de contacto' });
        expect((await auth('get', '/api/follow-ups/mine', 'owner')).body.map(record => record.id)).toContain(item.id);
        expect((await act(item, 'COMPLETE', 'owner', { notes: 'Datos confirmados' })).status).toBe(200);
        expect((await auth('get', '/api/follow-ups/mine', 'owner')).body.map(record => record.id)).not.toContain(item.id);
    });
    it('limita las acciones al responsable o a abogados y administradores', async () => {
        let item = await create(); const file = await upload();
        expect((await act(item, 'RECEIVE', 'colleague', { fileId: file.id })).status).toBe(403);
        item = (await act(item, 'RECEIVE', 'owner', { fileId: file.id })).body;
        expect((await act(item, 'VERIFY', 'owner')).status).toBe(403);
        expect((await act(item, 'REQUEST_REVISION', 'owner', { notes: 'No puede revisar' })).status).toBe(403);
        item = (await act(item, 'VERIFY', 'lawyer')).body;
        expect((await act(item, 'REOPEN', 'owner', { notes: 'No puede reabrir verificado' })).status).toBe(403);
        expect((await act(item, 'REOPEN', 'lawyer', { notes: 'Nueva revisión' })).status).toBe(200);
    });
    it('exige observaciones y respeta las transiciones y versiones', async () => {
        const item = await create();
        expect((await act(item, 'VERIFY', 'lawyer')).status).toBe(409);
        expect((await act(item, 'COMPLETE')).status).toBe(409);
        expect((await act(item, 'arbitrary')).status).toBe(400);
        const file = await upload();
        const received = await act(item, 'RECEIVE', 'owner', { fileId: file.id });
        expect((await act(received.body, 'REQUEST_REVISION', 'lawyer')).status).toBe(400);
        expect((await act(received.body, 'REOPEN', 'owner', { notes: ' ' })).status).toBe(400);
        expect((await act(item, 'RECEIVE', 'owner', { fileId: file.id })).status).toBe(409);
        expect(await prisma.followUpEvent.count({ where: { followUpId: item.id } })).toBe(2);
    });
    it('solo recibe archivos privados existentes y del mismo expediente', async () => {
        const item = await create(); const otherFile = await upload('case-b', 'other');
        for (const fileId of ['legacy', 'missing', otherFile.id]) expect((await act(item, 'RECEIVE', 'owner', { fileId })).status).toBe(400);
        const missingBytes = await upload(); unlinkSync(path.join(process.env.CASE_FILES_DIR, missingBytes.id));
        expect((await act(item, 'RECEIVE', 'owner', { fileId: missingBytes.id })).status).toBe(400);
        expect(await prisma.followUpEvent.count({ where: { followUpId: item.id } })).toBe(1);
    });
    it('protege el archivo recibido contra borrado hasta desvincularlo al reabrir', async () => {
        const file = await upload(); let item = await create();
        item = (await act(item, 'RECEIVE', 'owner', { fileId: file.id })).body;
        expect((await auth('delete', `/api/cases/files/${file.id}`)).status).toBe(409);
        expect(readFileSync(path.join(process.env.CASE_FILES_DIR, file.id))).toEqual(pdf);
        const reopened = await act(item, 'REOPEN', 'owner', { notes: 'Reemplazar documento' });
        expect(reopened.body.fileId).toBeNull();
        expect((await auth('delete', `/api/cases/files/${file.id}`)).status).toBe(200);
    });
    it('permite editar y reasignar con historial y rechaza ediciones obsoletas', async () => {
        const item = await create();
        const body = { ...defaultBody, title: 'Recibo actualizado', notes: 'Aclaración', ownerId: 'colleague', version: item.updatedAt };
        const response = await auth('patch', `/api/follow-ups/${item.id}`).send(body);
        expect(response.status).toBe(200); expect(response.body.ownerId).toBe('colleague');
        expect(JSON.parse(response.body.events[1].changes).before.ownerId).toBe('owner');
        expect((await auth('get', '/api/follow-ups/mine', 'colleague')).body.map(record => record.id)).toContain(item.id);
        expect((await auth('patch', `/api/follow-ups/${item.id}`).send(body)).status).toBe(409);
        const done = await act(response.body, 'RECEIVE', 'colleague', { fileId: (await upload()).id });
        const verified = await act(done.body, 'VERIFY', 'lawyer');
        expect((await auth('patch', `/api/follow-ups/${item.id}`).send({ ...body, version: verified.body.updatedAt })).status).toBe(409);
    });
    it.each([{ kind: 'bad' }, { title: '' }, { title: {} }, { title: 'x'.repeat(201) }, { dueDate: null }, { dueDate: 'bad' }, { ownerId: 'other' }, { ownerId: 'inactive' }, { ownerId: 'solo' }, { ownerId: {} }, { notes: [] }])('valida datos y responsables sin crear registros: %j', async invalid => {
        const count = await prisma.followUp.count();
        expect((await auth('post', '/api/follow-ups/case/case-a').send({ ...defaultBody, ...invalid })).status).toBe(400);
        expect(await prisma.followUp.count()).toBe(count);
    });
    it('ignora estados y autores suministrados por el cliente al crear', async () => {
        const item = await create({ status: 'VERIFIED', createdById: 'other', fileId: 'legacy' });
        expect(item.status).toBe('PENDING'); expect(item.createdById).toBe('admin'); expect(item.fileId).toBeNull();
    });
    it('aísla consultas y mutaciones entre estudios e independientes', async () => {
        const item = await create();
        for (const user of ['other', 'solo', 'solo2']) {
            expect((await auth('get', '/api/follow-ups/case/case-a', user)).status).toBe(404);
            expect((await auth('post', '/api/follow-ups/case/case-a', user).send(defaultBody)).status).toBe(404);
            expect((await act(item, 'RECEIVE', user)).status).toBe(404);
        }
        const independent = await create({ ownerId: 'solo' }, 'case-solo', 'solo');
        expect((await act(independent, 'RECEIVE', 'solo2')).status).toBe(404);
        expect((await auth('post', '/api/follow-ups/case/case-solo', 'super').send({ ...defaultBody, ownerId: 'solo2' })).status).toBe(400);
        expect((await auth('get', '/api/follow-ups/case/case-solo', 'super')).status).toBe(200);
    });
    it('filtra revisiones por rol, estudio y estado', async () => {
        let item = await create(); item = (await act(item, 'RECEIVE', 'owner', { fileId: (await upload()).id })).body;
        expect((await auth('get', '/api/follow-ups/to-review', 'lawyer')).body.map(record => record.id)).toContain(item.id);
        expect((await auth('get', '/api/follow-ups/to-review', 'owner')).body).toEqual([]);
        expect((await auth('get', '/api/follow-ups/to-review', 'other')).body).toEqual([]);
        await act(item, 'VERIFY', 'lawyer');
        expect((await auth('get', '/api/follow-ups/to-review', 'lawyer')).body.map(record => record.id)).not.toContain(item.id);
    });
    it('oculta expedientes eliminados y retira acceso a un responsable trasladado', async () => {
        const item = await create();
        expect((await auth('get', '/api/follow-ups/case/deleted', 'super')).status).toBe(404);
        await prisma.user.update({ where: { id: 'owner' }, data: { studioId: 'b' } });
        expect((await auth('get', '/api/follow-ups/mine', 'owner')).body).toEqual([]);
        expect((await act(item, 'RECEIVE', 'owner')).status).toBe(404);
        await prisma.user.update({ where: { id: 'owner' }, data: { studioId: 'a' } });
        await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: new Date() } });
        expect((await auth('get', '/api/follow-ups/to-review', 'super')).body.map(record => record.caseId)).not.toContain('case-a');
        await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: null } });
    });
});
