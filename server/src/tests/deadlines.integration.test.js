import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-deadlines-'));
const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET'].map(key => [key, process.env[key]]));
const NOW = new Date('2026-10-26T15:00:00.000Z');
const dates = {
    overdue: '2026-10-26T02:59:59.999Z',
    start: '2026-10-26T03:00:00.000Z',
    last: '2026-10-27T02:59:59.999Z',
    tomorrow: '2026-10-27T03:00:00.000Z',
    week: '2026-11-03T02:59:59.999Z',
    outside: '2026-11-03T03:00:00.000Z',
};
let prisma, app, tokens, checkUpcomingDeadlines;
const auth = (method, url, user = 'a', body) => {
    const req = request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
    return body === undefined ? req : req.send(body);
};
const create = (body = {}, user = 'a', caseId = 'case-a') => auth('post', `/api/deadlines/case/${caseId}`, user,
    { title: 'Plazo de prueba', dueDate: '2026-10-28', ...body });
const ids = items => items.map(item => item.id).sort();

it('registra creación, cumplimiento y eliminación del plazo sin avisos de otros estudios ni duplicados por guardar lo mismo',async()=>{
    const created=await create({title:'Plazo con actividad'});
    expect(created.status).toBe(201);
    const path=`/api/deadlines/${created.body.id}`;
    expect((await auth('put',path,'a',{isCompleted:true})).status).toBe(200);
    const before=await prisma.notification.count({where:{caseId:'case-a',type:'ACTIVITY'}});
    expect((await auth('put',path,'a',{isCompleted:true})).status).toBe(200);
    expect(await prisma.notification.count({where:{caseId:'case-a',type:'ACTIVITY'}})).toBe(before);
    expect((await auth('delete',path,'a')).status).toBe(200);
    const notices=await prisma.notification.findMany({where:{caseId:'case-a',type:'ACTIVITY',message:{contains:'Plazo con actividad'}}});
    expect(notices).toHaveLength(6);
    expect([...new Set(notices.map(n=>n.userId))].sort()).toEqual(['a','operator']);
    expect(notices.filter(n=>n.title==='Vencimiento eliminado')).toHaveLength(2);
});

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    for (const id of ['a', 'b']) await prisma.studio.create({ data: { id, name: id, cuit: id } });
    for (const [id, studioId, role] of [['a', 'a', 'LAWYER'], ['operator', 'a', 'OPERATOR'], ['b', 'b', 'LAWYER'],
        ['solo', null, 'LAWYER'], ['solo2', null, 'LAWYER'], ['super', null, 'SUPER_ADMIN'], ['inactive', 'a', 'LAWYER']]) {
        await prisma.user.create({ data: { id, studioId, role, name: id, email: `${id}@test.invalid`, password: 'unused',
            ...(id === 'inactive' ? { deletedAt: NOW } : {}) } });
    }
    for (const [id, studioId, createdById] of [['a', 'a', 'a'], ['b', 'b', 'b'], ['solo', null, 'solo'],
        ['solo2', null, 'solo2'], ['deleted', 'a', 'a']]) {
        await prisma.case.create({ data: { id: `case-${id}`, title: id, caseNumber: id, studioId, createdById,
            ...(id === 'deleted' ? { deletedAt: NOW } : {}) } });
        for (const [label, dueDate] of Object.entries(dates)) {
            await prisma.deadline.create({ data: { id: `${id}-${label}`, title: label, caseId: `case-${id}`, dueDate: new Date(dueDate) } });
        }
        await prisma.deadline.create({ data: { id: `${id}-completed`, title: 'Cumplido', caseId: `case-${id}`,
            dueDate: new Date(dates.tomorrow), isCompleted: true } });
    }
    tokens = Object.fromEntries((await prisma.user.findMany()).map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    app = express();
    app.use(express.json());
    app.use('/api/deadlines', (await import('../routes/deadlineRoutes.js')).default);
    app.use((await import('../middleware/errorMiddleware.js')).errorHandler);
    ({ checkUpcomingDeadlines } = await import('../skills/deadlineAgent.js'));
}, 30000);

beforeEach(() => {
    // Keep HTTP and Prisma timers real while controlling the calendar date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
});

afterEach(() => vi.useRealTimers());

afterAll(async () => {
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-deadlines-')) {
        throw new Error('Unexpected test directory');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Vencimientos: permisos y calendario con SQLite real', () => {
    it('exige sesión en todas las operaciones y rechaza cuentas inactivas', async () => {
        for (const [method, url] of [['get', '/upcoming'], ['get', '/my-day'], ['get', '/case/case-a'],
            ['post', '/case/case-a'], ['put', '/a-tomorrow'], ['delete', '/a-tomorrow']]) {
            expect((await request(app)[method](`/api/deadlines${url}`)).status).toBe(401);
        }
        expect((await auth('get', '/api/deadlines/my-day', 'inactive')).status).toBe(401);
    });

    it.each([['a', 'b'], ['operator', 'b'], ['solo', 'solo2'], ['solo', 'a'], ['a', 'solo']])(
        '%s no puede leer, crear, completar ni eliminar plazos de %s', async (user, target) => {
            const before = await prisma.deadline.findUnique({ where: { id: `${target}-tomorrow` } });
            const count = await prisma.deadline.count();
            expect((await auth('get', `/api/deadlines/case/case-${target}`, user)).status).toBe(404);
            expect((await create({}, user, `case-${target}`)).status).toBe(404);
            expect((await auth('put', `/api/deadlines/${target}-tomorrow`, user, { isCompleted: true })).status).toBe(404);
            expect((await auth('delete', `/api/deadlines/${target}-tomorrow`, user)).status).toBe(404);
            expect(await prisma.deadline.count()).toBe(count);
            expect(await prisma.deadline.findUnique({ where: { id: before.id } })).toEqual(before);
        });

    it.each([['a', ['a']], ['operator', ['a']], ['b', ['b']], ['solo', ['solo']], ['solo2', ['solo2']],
        ['super', ['a', 'b', 'solo', 'solo2']]])('Mi jornada de %s contiene solo sus expedientes y separa los límites del día y semana', async (user, cases) => {
        const result = await auth('get', '/api/deadlines/my-day?studioId=b', user);
        expect(result.status).toBe(200);
        const expected = labels => cases.flatMap(id => labels.map(label => `${id}-${label}`)).sort();
        expect(ids(result.body.overdue)).toEqual(expected(['overdue']));
        expect(ids(result.body.today)).toEqual(expected(['start', 'last']));
        expect(ids(result.body.upcoming)).toEqual(expected(['tomorrow', 'week']));
        expect(result.body.counts).toEqual({ overdue: cases.length, today: cases.length * 2,
            upcoming: cases.length * 2, total: cases.length * 5 });
    });

    it.each([['a', ['a']], ['solo', ['solo']], ['solo2', ['solo2']], ['super', ['a', 'b', 'solo', 'solo2']]])(
        'próximos 48 h de %s no expone otros titulares ni expedientes eliminados', async (user, cases) => {
            const result = await auth('get', '/api/deadlines/upcoming?studioId=b', user);
            expect(result.status).toBe(200);
            const expected = cases.flatMap(id => ['last', 'tomorrow'].map(label => `${id}-${label}`)).sort();
            expect(result.body.deadlines.map(item => item.deadlineId).sort()).toEqual(expected);
            expect(result.body.count).toBe(expected.length);
        });

    it.each(['a', 'super'])('oculta plazos de expedientes eliminados incluso para %s', async user => {
        expect((await auth('get', '/api/deadlines/case/case-deleted', user)).status).toBe(404);
        expect((await create({}, user, 'case-deleted')).status).toBe(404);
        expect((await auth('put', '/api/deadlines/deleted-tomorrow', user, { isCompleted: true })).status).toBe(404);
        expect((await auth('delete', '/api/deadlines/deleted-tomorrow', user)).status).toBe(404);
    });

    it.each([['operator', 'case-a'], ['solo', 'case-solo'], ['super', 'case-b']])(
        '%s puede crear, editar, completar y eliminar un plazo autorizado', async (user, caseId) => {
            const result = await create({ notes: 'Inicial' }, user, caseId);
            expect(result.status).toBe(201);
            const id = result.body.id;
            const listed = await auth('get', `/api/deadlines/case/${caseId}`, user);
            expect(ids(listed.body)).toContain(id);
            const updated = await auth('put', `/api/deadlines/${id}`, user, { title: 'Corregido', notes: null, isCompleted: true });
            expect(updated.status).toBe(200);
            expect(updated.body).toMatchObject({ title: 'Corregido', notes: null, isCompleted: true, dueDate: result.body.dueDate });
            expect((await auth('delete', `/api/deadlines/${id}`, user)).status).toBe(200);
            expect(await prisma.deadline.findUnique({ where: { id } })).toBeNull();
        });

    it('aplica cambios de pertenencia al estudio aunque el token sea anterior', async () => {
        await prisma.user.create({ data: { id: 'moved', studioId: 'a', role: 'LAWYER', name: 'Moved', email: 'moved@test.invalid', password: 'unused' } });
        tokens.moved = jwt.sign({ id: 'moved' }, process.env.JWT_SECRET);
        expect((await auth('get', '/api/deadlines/case/case-a', 'moved')).status).toBe(200);
        await prisma.user.update({ where: { id: 'moved' }, data: { studioId: 'b' } });
        expect((await auth('get', '/api/deadlines/case/case-a', 'moved')).status).toBe(404);
        const result = await auth('get', '/api/deadlines/upcoming', 'moved');
        expect(result.body.deadlines.every(item => item.caseNumber === 'b')).toBe(true);
    });

    it('antes de las 03:00 UTC todavía usa el día anterior en Córdoba', async () => {
        vi.setSystemTime(new Date('2026-10-26T02:30:00Z'));
        const result = await auth('get', '/api/deadlines/my-day', 'solo');
        expect(ids(result.body.today)).toEqual(['solo-overdue']);
        expect(result.body.overdue).toEqual([]);
        expect(ids(result.body.upcoming)).toEqual(['solo-last', 'solo-start', 'solo-tomorrow']);
    });

    it.each([
        ['2026-10-26', '2026-10-26T03:00:00.000Z'],
        ['2028-02-29', '2028-02-29T03:00:00.000Z'],
        ['2026-10-26T09:30:00-03:00', '2026-10-26T12:30:00.000Z'],
        ['2026-10-26T09:30:00Z', '2026-10-26T09:30:00.000Z'],
    ])('guarda %s sin desplazar el día elegido ni alterar un instante explícito', async (dueDate, expected) => {
        const result = await create({ dueDate });
        expect(result.status).toBe(201);
        expect(result.body.dueDate).toBe(expected);
        expect((await auth('put', `/api/deadlines/${result.body.id}`, 'a', { dueDate })).body.dueDate).toBe(expected);
        await auth('delete', `/api/deadlines/${result.body.id}`);
    });

    it.each(['invalid', '', null, 42, {}, '2026-02-29', '2026-02-30T12:00:00Z', '2026-13-01',
        '2026-10-26T12:00:00', '2026-10-26T25:00:00Z'])('rechaza una fecha inválida o ambigua: %j', async dueDate => {
        const count = await prisma.deadline.count();
        const before = await prisma.deadline.findUnique({ where: { id: 'a-tomorrow' } });
        expect((await create({ dueDate })).status).toBe(400);
        expect((await auth('put', '/api/deadlines/a-tomorrow', 'a', { dueDate })).status).toBe(400);
        expect(await prisma.deadline.count()).toBe(count);
        expect(await prisma.deadline.findUnique({ where: { id: 'a-tomorrow' } })).toEqual(before);
    });

    it.each([{ title: ' ' }, { title: {} }, { notes: [] }, { isCompleted: 'false' }])(
        'rechaza otros datos inválidos sin modificar un vencimiento: %j', async body => {
            const before = await prisma.deadline.findUnique({ where: { id: 'a-tomorrow' } });
            expect((await create(body)).status).toBe(400);
            expect((await auth('put', '/api/deadlines/a-tomorrow', 'a', body)).status).toBe(400);
            expect(await prisma.deadline.findUnique({ where: { id: 'a-tomorrow' } })).toEqual(before);
        });
});

describe('Avisos automáticos con almacenamiento real', () => {
    it('mantiene las horas restantes entre avisos, evita duplicados y omite asignaciones sin acceso', async () => {
        for (const [id, studioId, createdById, assignedLawyerId, deletedAt] of [
            ['agent-active', 'a', 'a', 'a', null],
            ['agent-deleted', 'a', 'a', 'a', NOW],
            ['agent-inactive', 'a', 'a', 'inactive', null],
            ['agent-moved', 'a', 'a', 'b', null],
            ['agent-independent', null, 'solo', 'a', null],
        ]) {
            await prisma.case.create({ data: { id, caseNumber: id, title: id, studioId, createdById, assignedLawyerId, deletedAt } });
            await prisma.deadline.create({ data: { id, caseId: id, title: id, dueDate: new Date(NOW.getTime() + 6 * 3600000) } });
        }
        await prisma.deadline.create({ data: { id: 'agent-second', caseId: 'agent-active', title: 'Segundo aviso',
            dueDate: new Date(NOW.getTime() + 10 * 3600000) } });
        for (const [id, hours, isCompleted] of [['agent-outside', 49, false], ['agent-overdue', -1, false], ['agent-completed', 1, true]]) {
            await prisma.deadline.create({ data: { id, caseId: 'agent-active', title: id, isCompleted,
                dueDate: new Date(NOW.getTime() + hours * 3600000) } });
        }
        const result = await checkUpcomingDeadlines();
        expect(result.notifications).toHaveLength(2);
        expect(result.notifications.every(item => item.userId === 'a' && item.caseId === 'agent-active')).toBe(true);
        expect(result.notifications.map(item => item.title).sort()).toEqual([
            '⚠️ Vencimiento en 10hs — agent-active', '⚠️ Vencimiento en 6hs — agent-active',
        ]);
        expect(result.notifications.every(item => item.message.includes('26/10/2026'))).toBe(true);
        // SQLite's CURRENT_TIMESTAMP uses the real clock; align persisted rows to the frozen test clock.
        await prisma.notification.updateMany({ where: { caseId: 'agent-active' }, data: { createdAt: NOW } });
        expect((await checkUpcomingDeadlines()).notifications).toEqual([]);
        expect(await prisma.notification.count({where:{type:'DEADLINE_ALERT'}})).toBe(2);
    });

    it('un aviso del día anterior en Córdoba no bloquea el aviso de hoy', async () => {
        await prisma.case.create({ data: { id: 'agent-renew-case', caseNumber: 'agent-renew-case', title: 'Renovación',
            studioId: 'a', createdById: 'a', assignedLawyerId: 'a' } });
        await prisma.deadline.create({ data: { id: 'agent-renew', caseId: 'agent-renew-case', title: 'Renovar aviso',
            dueDate: new Date(NOW.getTime() + 6 * 3600000) } });
        await prisma.notification.create({ data: { userId: 'a', caseId: 'agent-renew-case', title: 'Aviso anterior',
            type: 'DEADLINE_ALERT', message: '[Plazo ID: agent-renew]', createdAt: new Date('2026-10-26T02:59:59.999Z') } });
        const result = await checkUpcomingDeadlines();
        const renewed = result.notifications.filter(item => item.caseId === 'agent-renew-case');
        expect(renewed).toHaveLength(1);
        expect(renewed[0].message).toContain('[Plazo ID: agent-renew]');
    });
});
