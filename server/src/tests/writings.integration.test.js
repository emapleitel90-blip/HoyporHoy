import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import JSZip from 'jszip';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-writings-'));
const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET'].map(key => [key, process.env[key]]));
const originalContent = 'Primera línea & <dato>\n\t  Segunda línea con ñ\n\nÚltimo párrafo.';
let prisma, app, tokens;
const auth = (method, url, user = 'operator') => request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
const creation = (overrides = {}) => ({ title: 'Escrito de prueba', content: originalContent, notes: '', requestId: randomUUID(), ...overrides });
const create = async (overrides = {}, caseId = 'case-a', user = 'operator') => {
    const response = await auth('post', `/api/writings/case/${caseId}`, user).send(creation(overrides));
    expect(response.status).toBe(201);
    return response.body;
};
const revision = (item, overrides = {}) => ({ title: item.selectedVersion.title, content: 'Texto de la segunda versión.',
    notes: 'Se incorporó la corrección solicitada.', expectedVersion: item.currentVersion, requestId: randomUUID(), ...overrides });
const version = (item, body, user = 'operator') => auth('post', `/api/writings/${item.id}/versions`, user).send(body);
const binary = (response, done) => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => done(null, Buffer.concat(chunks)));
    response.on('error', done);
};

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    for (const id of ['a', 'b']) await prisma.studio.create({ data: { id, name: `Estudio ${id}`, cuit: id } });
    for (const [id, studioId, role] of [['operator', 'a', 'OPERATOR'], ['lawyer', 'a', 'LAWYER'], ['admin', 'a', 'ADMIN'],
        ['other', 'b', 'LAWYER'], ['solo', null, 'OPERATOR'], ['solo2', null, 'LAWYER'], ['super', null, 'SUPER_ADMIN'],
        ['inactive', 'a', 'OPERATOR'], ['unknown', 'a', 'READ_ONLY']]) {
        await prisma.user.create({ data: { id, studioId, role, name: `Persona ${id}`, email: `${id}@writings.invalid`, password: 'unused',
            ...(id === 'inactive' ? { deletedAt: new Date() } : {}) } });
    }
    for (const [id, studioId, createdById] of [['case-a', 'a', 'lawyer'], ['case-b', 'b', 'other'], ['case-solo', null, 'solo'], ['deleted', 'a', 'lawyer']]) {
        await prisma.case.create({ data: { id, studioId, createdById, caseNumber: id, title: id,
            ...(id === 'deleted' ? { deletedAt: new Date() } : {}) } });
    }
    tokens = Object.fromEntries((await prisma.user.findMany()).map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    app = express(); app.use(express.json());
    app.use('/api/writings', (await import('../routes/writingRoutes.js')).default);
    app.use('/api/notifications', (await import('../routes/notificationRoutes.js')).default);
    app.use((await import('../middleware/errorMiddleware.js')).errorHandler);
}, 30000);

afterAll(async () => {
    vi.restoreAllMocks();
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-writings-')) {
        throw new Error('Unexpected test directory');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Escritos manuales con versiones persistentes y Word privado', () => {
    it('pagina avisos antiguos sin repetir empates de fecha y rechaza cursores ajenos',async()=>{
        const prefix=randomUUID();const date=new Date('2035-01-01T00:00:00Z');
        for(let index=0;index<53;index++)await prisma.notification.create({data:{id:`${prefix}-${String(index).padStart(3,'0')}`,userId:'lawyer',caseId:'case-a',title:'Aviso de página',message:'Ficticio',createdAt:date}});
        const first=await auth('get','/api/notifications','lawyer');
        expect(first.status).toBe(200);expect(first.body.notifications).toHaveLength(50);
        const second=await auth('get',`/api/notifications?cursor=${first.body.nextCursor}`,'lawyer');
        expect(second.status).toBe(200);
        expect(second.body.notifications.filter(n=>n.id.startsWith(prefix))).toHaveLength(3);
        expect(second.body.notifications.some(n=>first.body.notifications.some(old=>old.id===n.id))).toBe(false);
        expect((await auth('get',`/api/notifications?cursor=${first.body.nextCursor}`,'other')).status).toBe(404);
        expect((await auth('get','/api/notifications?cursor=','lawyer')).status).toBe(400);
        expect((await auth('get','/api/notifications?cursor[in]=fake','lawyer')).status).toBe(400);
        await prisma.notification.deleteMany({where:{id:{startsWith:prefix}}});
    });
    it('notifica cambios por usuario sin duplicarlos y retira acceso al cambiar el estudio del expediente',async()=>{
        const task=await prisma.task.create({data:{title:'Tarea para aviso',caseId:'case-a',assigneeId:'operator',reviewerId:'lawyer',createdById:'lawyer',
            events:{create:{userId:'operator',action:'SUBMITTED',toStatus:'SUBMITTED'}}}});
        const first=await auth('get','/api/notifications','lawyer');
        expect(first.status).toBe(200);
        const notice=first.body.notifications.find(n=>n.message.includes('Tarea para aviso'));
        expect(notice).toMatchObject({title:'Escrito o tarea entregada',isRead:false,caseId:'case-a'});
        expect(notice.message).toContain('Persona operator');
        const repeat=await auth('get','/api/notifications','lawyer');
        expect(repeat.body.notifications.filter(n=>n.id===notice.id)).toHaveLength(1);
        expect((await auth('put',`/api/notifications/${notice.id}/read`,'other').send({})).status).toBe(404);
        expect((await auth('put',`/api/notifications/${notice.id}/read`,'lawyer').send({})).status).toBe(200);
        expect((await auth('get','/api/notifications','lawyer')).body.notifications.find(n=>n.id===notice.id).isRead).toBe(true);
        expect((await auth('get','/api/notifications','operator')).body.notifications.find(n=>n.message.includes('Tarea para aviso')).isRead).toBe(false);
        expect((await auth('get','/api/notifications','other')).body.notifications).toEqual([]);
        expect((await auth('get','/api/notifications','solo')).body.notifications).toEqual([]);
        await prisma.case.update({where:{id:'case-a'},data:{deletedAt:new Date()}});
        expect((await auth('get','/api/notifications','lawyer')).body.notifications.some(n=>n.id===notice.id)).toBe(false);
        expect((await auth('put',`/api/notifications/${notice.id}/read`,'lawyer').send({})).status).toBe(404);
        await prisma.case.update({where:{id:'case-a'},data:{deletedAt:null}});
        await prisma.taskEvent.deleteMany({where:{taskId:task.id}});await prisma.task.delete({where:{id:task.id}});
    });
    it('comparte modelos solo dentro del estudio y reserva su creación a revisores', async () => {
        const url='/api/writings/templates/case/case-a';
        const model={title:'Modelo ficticio',content:'Cliente: {{cliente}}\nObjeto: {{objeto}}',jurisdiction:'Córdoba',fuero:'Civil',kind:'Escrito',requestId:randomUUID()};
        expect((await auth('post',url,'operator').send(model)).status).toBe(403);
        const created=await auth('post',url,'lawyer').send(model);
        expect(created.status).toBe(201);
        const modelNotices=()=>prisma.notification.findMany({where:{caseId:'case-a',title:'Modelo incorporado a la biblioteca',message:{contains:model.title}}});
        const initialNotices=await modelNotices();
        expect(initialNotices.length).toBeGreaterThan(0);
        expect(initialNotices.every(n=>n.message==='Persona lawyer · Modelo ficticio')).toBe(true);
        expect(initialNotices.map(n=>n.userId)).toContain('operator');
        expect(initialNotices.map(n=>n.userId)).not.toContain('other');
        expect(initialNotices.map(n=>n.userId)).not.toContain('inactive');
        const replay=await auth('post',url,'lawyer').send(model);
        expect(replay.status).toBe(200);expect(replay.body.id).toBe(created.body.id);
        expect(await modelNotices()).toHaveLength(initialNotices.length);
        expect((await auth('post',url,'lawyer').send({...model,content:'Distinto'})).status).toBe(409);
        expect((await auth('get',url,'operator')).body.map(item=>item.id)).toContain(created.body.id);
        expect((await auth('get',url,'other')).status).toBe(404);
        expect((await auth('get','/api/writings/templates/case/case-b','other')).body).toEqual([]);
        expect((await auth('get','/api/writings/templates/case/case-solo','solo')).body).toEqual([]);
        expect((await auth('post',url,'lawyer').send({...model,requestId:randomUUID(),scope:'studio:b'})).status).toBe(400);
        expect((await request(app).get(url)).status).toBe(401);
        await prisma.$disconnect();
        expect((await auth('get',url,'operator')).body.find(item=>item.id===created.body.id).content).toBe(model.content);
    });
    it('permite al operador crear un borrador y conserva texto, autor y versión al reconectar', async () => {
        const item = await create({ title: '  Escrito de prueba  ' });
        expect(item).toMatchObject({ caseId: 'case-a', currentVersion: 1, createdById: 'operator', createdByName: 'Persona operator',
            selectedVersion: { number: 1, previousVersion: 0, title: 'Escrito de prueba', content: originalContent,
                notes: '', createdById: 'operator', createdByName: 'Persona operator' } });
        expect(item.versions).toHaveLength(1);
        expect(item.versions[0]).not.toHaveProperty('content');
        expect(item).not.toHaveProperty('status');
        expect(item.selectedVersion).not.toHaveProperty('approvedById');
        await prisma.$disconnect();
        tokens.operator = jwt.sign({ id: 'operator' }, process.env.JWT_SECRET);
        const loaded = await auth('get', `/api/writings/${item.id}`);
        expect(loaded.status).toBe(200);
        expect(loaded.body).toEqual(item);
    });

    it.each(['lawyer', 'admin', 'super'])('permite crear y versionar al participante autorizado: %s', async user => {
        const item = await create({}, 'case-a', user);
        const saved = await version(item, revision(item), user);
        expect(saved.status).toBe(201);
        expect(saved.body).toMatchObject({ currentVersion: 2, selectedVersion: { number: 2, createdById: user } });
    });

    it('lista solamente metadatos del expediente, sin todos los cuerpos de los escritos', async () => {
        const item = await create();
        const newer = await version(item, revision(item, { title: 'Título actualizado' }));
        expect(newer.status).toBe(201);
        const listed = await auth('get', '/api/writings/case/case-a');
        expect(listed.status).toBe(200);
        const entry = listed.body.find(row => row.id === item.id);
        expect(entry).toMatchObject({ caseId: 'case-a', currentVersion: 2,
            latestVersion: { number: 2, title: 'Título actualizado' } });
        expect(entry).not.toHaveProperty('versions');
        expect(entry).not.toHaveProperty('content');
        expect(entry.latestVersion).not.toHaveProperty('content');
        expect(JSON.stringify(listed.body)).not.toContain(originalContent);
    });

    it('conserva versiones anteriores y su autor aunque cambien el contenido y el nombre de la cuenta', async () => {
        const item = await create();
        const first = item.selectedVersion;
        try {
            await prisma.user.update({ where: { id: 'operator' }, data: { name: 'Nombre posterior' } });
            const saved = await version(item, revision(item));
            expect(saved.status).toBe(201);
            expect(saved.body.selectedVersion).toMatchObject({ number: 2, previousVersion: 1, createdByName: 'Nombre posterior' });
            expect(saved.body.versions.map(row => row.number)).toEqual([2, 1]);
            const older = await auth('get', `/api/writings/${item.id}/versions/1`);
            expect(older.status).toBe(200);
            expect(older.body.currentVersion).toBe(2);
            expect(older.body.selectedVersion).toEqual(first);
            expect(saved.body.versions[1]).not.toHaveProperty('content');
        } finally {
            await prisma.user.update({ where: { id: 'operator' }, data: { name: 'Persona operator' } });
        }
    });

    it('reintenta la creación exacta sin duplicar el escrito y conserva la versión guardada en el replay', async () => {
        const body = creation();
        const first = await auth('post', '/api/writings/case/case-a').send(body);
        expect(first.status).toBe(201);
        expect((await version(first.body, revision(first.body))).status).toBe(201);
        const count = await prisma.writing.count();
        const repeated = await auth('post', '/api/writings/case/case-a').send(body);
        expect(repeated.status).toBe(200);
        expect(repeated.body).toMatchObject({ id: first.body.id, currentVersion: 2,
            selectedVersion: { id: first.body.selectedVersion.id, number: 1, content: body.content } });
        expect(await prisma.writing.count()).toBe(count);
        expect(await prisma.writingVersion.count({ where: { writingId: first.body.id } })).toBe(2);
    });

    it('normaliza saltos de línea y espacios de metadatos sin perder sangrías, líneas vacías ni caracteres Unicode', async () => {
        const body = creation({ title: '  Título normalizado  ', content: '  Inicio 😀\r\n\tContinuación\r\rFin  ', notes: '  Nota inicial  ' });
        const first = await auth('post', '/api/writings/case/case-a').send(body);
        expect(first.status).toBe(201);
        expect(first.body.selectedVersion).toMatchObject({ title: 'Título normalizado', content: '  Inicio 😀\n\tContinuación\n\nFin  ', notes: 'Nota inicial' });
        const repeated = await auth('post', '/api/writings/case/case-a').send({ ...body, title: 'Título normalizado',
            content: '  Inicio 😀\n\tContinuación\n\nFin  ', notes: 'Nota inicial' });
        expect(repeated.status).toBe(200);
        expect(repeated.body.id).toBe(first.body.id);
    });

    it.each(['title', 'content', 'notes'])('rechaza reutilizar el UUID de creación con otro %s', async field => {
        const body = creation();
        const first = await auth('post', '/api/writings/case/case-a').send(body);
        expect(first.status).toBe(201);
        const count = await prisma.writing.count();
        expect((await auth('post', '/api/writings/case/case-a').send({ ...body, [field]: 'Datos distintos' })).status).toBe(409);
        expect(await prisma.writing.count()).toBe(count);
    });

    it('hace idempotente una versión incluso si se creó otra posterior', async () => {
        const item = await create();
        const body = revision(item);
        const second = await version(item, body);
        expect(second.status).toBe(201);
        const third = await version(second.body, revision(second.body, { content: 'Texto tercera versión.' }));
        expect(third.status).toBe(201);
        const repeated = await version(item, body);
        expect(repeated.status).toBe(200);
        expect(repeated.body).toMatchObject({ currentVersion: 3, selectedVersion: { id: second.body.selectedVersion.id, number: 2,
            content: body.content, previousVersion: 1 } });
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(3);
    });

    it.each(['title', 'content', 'notes', 'expectedVersion'])('no acepta un UUID de versión usado con otro %s', async field => {
        const item = await create();
        const body = revision(item);
        expect((await version(item, body)).status).toBe(201);
        expect((await version(item, { ...body, [field]: field === 'expectedVersion' ? 2 : 'Otro dato' })).status).toBe(409);
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(2);
    });

    it('rechaza una versión base antigua sin perder la versión que ya se guardó', async () => {
        const item = await create();
        const saved = await version(item, revision(item));
        expect(saved.status).toBe(201);
        expect((await version(item, revision(item, { content: 'Cambio obsoleto' }))).status).toBe(409);
        const current = await auth('get', `/api/writings/${item.id}`);
        expect(current.body.selectedVersion).toEqual(saved.body.selectedVersion);
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(2);
    });

    it('solo confirma una de dos nuevas versiones concurrentes sobre la misma base', async () => {
        const item = await create();
        const replies = await Promise.all([
            version(item, revision(item, { content: 'Cambios de la primera persona' })),
            version(item, revision(item, { content: 'Cambios de la segunda persona' })),
        ]);
        expect(replies.map(reply => reply.status).sort()).toEqual([201, 409]);
        const persisted = await auth('get', `/api/writings/${item.id}`);
        expect(persisted.body.currentVersion).toBe(2);
        expect(persisted.body.selectedVersion.content).toBe(replies.find(reply => reply.status === 201).body.selectedVersion.content);
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(2);
    }, 15000);

    it('requiere sesión y cuenta activa para lista, detalle, escritura y exportación', async () => {
        const item = await create();
        for (const [method, url] of [['get', '/api/writings/case/case-a'], ['get', `/api/writings/${item.id}`],
            ['get', `/api/writings/${item.id}/versions/1`], ['get', `/api/writings/${item.id}/versions/1/word`],
            ['post', '/api/writings/case/case-a'], ['post', `/api/writings/${item.id}/versions`]]) {
            expect((await request(app)[method](url).send({})).status).toBe(401);
            expect((await auth(method, url, 'inactive').send({})).status).toBe(401);
        }
    });

    it.each(['other', 'solo', 'solo2'])('oculta escritos ajenos en todas las rutas: %s', async user => {
        const item = await create();
        for (const url of ['/api/writings/case/case-a', `/api/writings/${item.id}`, `/api/writings/${item.id}/versions/1`,
            `/api/writings/${item.id}/versions/1/word`]) expect((await auth('get', url, user)).status).toBe(404);
        expect((await auth('post', '/api/writings/case/case-a', user).send(creation())).status).toBe(404);
        expect((await version(item, revision(item), user)).status).toBe(404);
    });

    it('limita un expediente independiente a su titular y al administrador global', async () => {
        const item = await create({}, 'case-solo', 'solo');
        expect((await auth('get', `/api/writings/${item.id}`, 'solo')).status).toBe(200);
        expect((await auth('get', `/api/writings/${item.id}`, 'super')).status).toBe(200);
        expect((await auth('get', `/api/writings/${item.id}`, 'solo2')).status).toBe(404);
        expect((await version(item, revision(item), 'solo2')).status).toBe(404);
        expect((await version(item, revision(item), 'solo')).status).toBe(201);
    });

    it('retira el acceso cuando cambia el estudio de la cuenta y cuando se elimina el expediente', async () => {
        const item = await create();
        try {
            await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'b' } });
            expect((await auth('get', `/api/writings/${item.id}`)).status).toBe(404);
            expect((await version(item, revision(item))).status).toBe(404);
            await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: new Date() } });
            expect((await auth('get', `/api/writings/${item.id}`, 'super')).status).toBe(404);
            expect((await auth('get', `/api/writings/${item.id}/versions/1/word`, 'super')).status).toBe(404);
        } finally {
            await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'a' } });
            await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: null } });
        }
        expect((await auth('post', '/api/writings/case/deleted').send(creation())).status).toBe(404);
    });

    it.each([
        [{ studioId: 'b' }, 404],
        [{ deletedAt: new Date('2026-10-28T03:00:00Z') }, 401],
        [{ role: 'READ_ONLY' }, 403],
    ])('relee la cuenta dentro de la transacción de guardado: %j', async (changes, status) => {
        const item = await create();
        const count = await prisma.writingVersion.count();
        const runTransaction = prisma.$transaction.bind(prisma);
        const transaction = vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (...args) => {
            await prisma.user.update({ where: { id: 'operator' }, data: changes });
            return runTransaction(...args);
        });
        try {
            expect((await version(item, revision(item))).status).toBe(status);
            expect(await prisma.writingVersion.count()).toBe(count);
            expect((await prisma.writing.findUnique({ where: { id: item.id } })).currentVersion).toBe(1);
        } finally {
            transaction.mockRestore();
            await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'a', role: 'OPERATOR', deletedAt: null } });
        }
    });

    it('rechaza escritura de roles desconocidos y no acepta aprobación o edición directa de versiones', async () => {
        const item = await create();
        expect((await auth('post', '/api/writings/case/case-a', 'unknown').send(creation())).status).toBe(403);
        expect((await version(item, revision(item), 'unknown')).status).toBe(403);
        for (const [method, url] of [['patch', `/api/writings/${item.id}/versions/1`], ['delete', `/api/writings/${item.id}/versions/1`],
            ['post', `/api/writings/${item.id}/approve`]]) expect((await auth(method, url).send({ content: 'Sobrescritura', status: 'APPROVED' })).status).toBe(404);
        expect((await auth('get', `/api/writings/${item.id}/versions/1`)).body.selectedVersion.content).toBe(originalContent);
    });

    it('rechaza autores, estado de aprobación y números de versión elegidos por el cliente', async () => {
        const count = await prisma.writing.count();
        for (const extra of [{ createdById: 'super' }, { createdByName: 'Autor falsificado' }, { currentVersion: 9 }, { status: 'APPROVED' }, { caseId: 'case-b' }]) {
            expect((await auth('post', '/api/writings/case/case-a').send(creation(extra))).status).toBe(400);
        }
        expect(await prisma.writing.count()).toBe(count);
        const item = await create();
        expect((await version(item, revision(item, { number: 9 }))).status).toBe(400);
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(1);
    });

    it.each([
        { title: '' }, { title: ' ' }, { title: {} }, { title: 'x'.repeat(201) },
        { content: '' }, { content: ' \n\t ' }, { content: [] }, { content: 'x'.repeat(20001) },
        { content: 'No válido\u0000' }, { content: 'No válido\u000b' }, { content: 'Surrogate inválido\ud800' }, { title: 'Título\u0001' },
        { notes: [] }, { notes: 'x'.repeat(2001) }, { notes: 'Nota\u0002' },
        { requestId: 'not-a-uuid' }, { requestId: null },
    ])('valida el escrito antes de crear registros: %j', async invalid => {
        const count = await prisma.writing.count();
        expect((await auth('post', '/api/writings/case/case-a').send(creation(invalid))).status).toBe(400);
        expect(await prisma.writing.count()).toBe(count);
    });

    it.each([
        { notes: '' }, { notes: ' ' }, { expectedVersion: '1' }, { expectedVersion: 0 }, { expectedVersion: 1.5 },
        { expectedVersion: null }, { expectedVersion: 2147483648 }, { content: 'Texto\u0000' },
    ])('valida las nuevas versiones sin avanzar el contador: %j', async invalid => {
        const item = await create();
        expect((await version(item, revision(item, invalid))).status).toBe(400);
        expect((await prisma.writing.findUnique({ where: { id: item.id } })).currentVersion).toBe(1);
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(1);
    });

    it('no crea una versión si solo cambian las observaciones', async () => {
        const item = await create();
        expect((await version(item, revision(item, { content: originalContent }))).status).toBe(400);
        expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(1);
    });

    it('permite cambiar solo el título y conserva el cuerpo original', async () => {
        const item = await create();
        const saved = await version(item, revision(item, { title: 'Título corregido', content: originalContent }));
        expect(saved.status).toBe(201);
        expect(saved.body.selectedVersion).toMatchObject({ number: 2, title: 'Título corregido', content: originalContent });
    });

    it('revierte conjuntamente el contador y la versión si falla el almacenamiento de la versión', async () => {
        const item = await create();
        await prisma.$executeRawUnsafe(`CREATE TRIGGER writing_test_failure BEFORE INSERT ON WritingVersion WHEN NEW.writingId = '${item.id}' AND NEW.number = 2 BEGIN SELECT RAISE(ABORT, 'writing test failure'); END`);
        try {
            const response = await version(item, revision(item));
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.body).not.toHaveProperty('stack');
            expect((await prisma.writing.findUnique({ where: { id: item.id } })).currentVersion).toBe(1);
            expect(await prisma.writingVersion.count({ where: { writingId: item.id } })).toBe(1);
        } finally {
            await prisma.$executeRawUnsafe('DROP TRIGGER writing_test_failure');
        }
    });

    it.each(['0', '-1', '1.5', 'abc', '2147483648'])('rechaza un número de versión inválido: %s', async number => {
        const item = await create();
        expect((await auth('get', `/api/writings/${item.id}/versions/${number}`)).status).toBe(400);
        expect((await auth('get', `/api/writings/${item.id}/versions/${number}/word`)).status).toBe(400);
    });

    it('responde 404 por escritos y versiones inexistentes sin entregar otro texto', async () => {
        const item = await create();
        expect((await auth('get', '/api/writings/no-existe')).status).toBe(404);
        expect((await auth('get', `/api/writings/${item.id}/versions/99`)).status).toBe(404);
        expect((await auth('get', `/api/writings/${item.id}/versions/99/word`)).status).toBe(404);
    });

    it('exporta metadatos XML válidos con nombres anteriores incompatibles sin reescribir la autoría guardada', async () => {
        const unsafeName = 'Persona & <Nombre>\u0001\uFFFF 😀';
        const invalidXml = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\uD800-\uDFFF\uFFFE\uFFFF]/u;
        try {
            await prisma.user.update({ where: { id: 'operator' }, data: { name: unsafeName } });
            const item = await create();
            expect(item.selectedVersion.createdByName).toBe(unsafeName);
            const exported = await auth('get', `/api/writings/${item.id}/versions/1/word`).buffer(true).parse(binary);
            expect(exported.status).toBe(200);
            const coreXml = await (await JSZip.loadAsync(exported.body)).file('docProps/core.xml').async('string');
            expect(coreXml).not.toMatch(invalidXml);
            expect(coreXml).toContain('Persona &amp; &lt;Nombre&gt; 😀');
            expect((await prisma.writingVersion.findUnique({ where: { id: item.selectedVersion.id } })).createdByName).toBe(unsafeName);
            // A malformed UTF-16 value cannot round-trip through SQLite's UTF-8 text;
            // exercise that input directly at the export boundary as well.
            const { writingWord } = await import('../utils/writingWord.js');
            const buffer = await writingWord({ ...item.selectedVersion, createdByName: unsafeName + '\ud800' });
            const malformedCore = await (await JSZip.loadAsync(buffer)).file('docProps/core.xml').async('string');
            expect(malformedCore).not.toMatch(invalidXml);
            expect(malformedCore).toContain('Persona &amp; &lt;Nombre&gt; 😀');
        } finally {
            await prisma.user.update({ where: { id: 'operator' }, data: { name: 'Persona operator' } });
        }
    });

    it('exporta el Word de la versión seleccionada, escapando XML y sin sustituirla por datos posteriores', async () => {
        const item = await create({ title: 'Original & <título>' });
        const saved = await version(item, revision(item, { title: 'Título posterior', content: 'Cuerpo posterior que no debe aparecer en la primera versión.' }));
        expect(saved.status).toBe(201);
        await prisma.case.update({ where: { id: 'case-a' }, data: { title: 'Datos actuales distintos del expediente' } });
        try {
            const response = await auth('get', `/api/writings/${item.id}/versions/1/word`).buffer(true).parse(binary);
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            expect(response.headers['content-disposition']).toMatch(/^attachment;/);
            expect(response.headers['content-disposition']).toMatch(/v1\.docx/);
            expect(response.headers['cache-control']).toContain('no-store');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.body.subarray(0, 2).toString()).toBe('PK');
            const zip = await JSZip.loadAsync(response.body);
            const xml = await zip.file('word/document.xml').async('string');
            expect(xml).toContain('Original &amp; &lt;título&gt;');
            expect(xml).toContain('Primera línea &amp; &lt;dato&gt;');
            expect(xml).toContain('Segunda línea con ñ');
            expect(xml).toContain('Último párrafo.');
            expect(xml).toMatch(/<w:tab\s*\/>/);
            expect(xml).toContain('xml:space="preserve"');
            expect(xml).not.toContain('Cuerpo posterior');
            expect(xml).not.toContain('Datos actuales distintos');
            expect(xml).not.toContain('APPROVED');
            const footerXml = await zip.file('word/footer1.xml').async('string');
            expect(footerXml).toContain('Versión 1');
            expect((await auth('get', `/api/writings/${item.id}/versions/1/word`, 'other')).status).toBe(404);
            const latest = await auth('get', `/api/writings/${item.id}/versions/2/word`).buffer(true).parse(binary);
            expect(latest.status).toBe(200);
            const laterXml = await (await JSZip.loadAsync(latest.body)).file('word/document.xml').async('string');
            expect(laterXml).toContain('Título posterior');
            expect(laterXml).toContain('Cuerpo posterior');
            expect(laterXml).not.toContain('Original &amp; &lt;título&gt;');
        } finally {
            await prisma.case.update({ where: { id: 'case-a' }, data: { title: 'case-a' } });
        }
    });
});
