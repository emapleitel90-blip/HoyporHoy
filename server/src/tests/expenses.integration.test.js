import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-expenses-'));
const storage = path.join(directory, 'files');
const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET', 'CASE_FILES_DIR'].map(key => [key, process.env[key]]));
const pdf = Buffer.from('%PDF-1.4\nComprobante de prueba\n%%EOF\n');
let prisma, app, tokens;
const auth = (method, url, user = 'a') => request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
const create = (caseId = 'case-a', user = 'a', bytes = pdf, filename = 'comprobante.pdf') => {
    const req = auth('post', `/api/expenses/case/${caseId}`, user)
        .field('description', 'Tasa de justicia').field('amount', '123.45').field('type', 'TASA_JUSTICIA');
    return bytes === null ? req : req.attach('file', bytes, { filename, contentType: 'application/pdf' });
};
const attach = (expense, user = 'a', version = expense.updatedAt, bytes = pdf) => auth('post', `/api/expenses/${expense.id}/receipt`, user)
    .field('version', version).attach('file', bytes, { filename: 'nuevo.pdf', contentType: 'application/pdf' });
const snapshot = async () => ({ files: readdirSync(storage).sort(), metadata: await prisma.caseFile.count(),
    expenses: await prisma.expense.count(), notifications: await prisma.notification.count() });
const binary = (res, done) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => done(null, Buffer.concat(chunks)));
    res.on('error', done);
};

beforeAll(async () => {
    mkdirSync(storage);
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    process.env.CASE_FILES_DIR = storage;
    prisma = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    for (const id of ['a', 'b']) await prisma.studio.create({ data: { id, name: id, cuit: id } });
    for (const [id, studioId, role] of [['a', 'a', 'LAWYER'], ['operator', 'a', 'OPERATOR'], ['b', 'b', 'LAWYER'],
        ['solo', null, 'LAWYER'], ['solo2', null, 'LAWYER'], ['super', null, 'SUPER_ADMIN'], ['inactive', 'a', 'LAWYER']]) {
        await prisma.user.create({ data: { id, studioId, role, name: id, email: `${id}@test.invalid`, password: 'unused',
            ...(id === 'inactive' ? { deletedAt: new Date() } : {}) } });
    }
    for (const [id, studioId, createdById] of [['a', 'a', 'a'], ['b', 'b', 'b'], ['solo', null, 'solo'], ['solo2', null, 'solo2']]) {
        await prisma.case.create({ data: { id: `case-${id}`, title: id, caseNumber: id, studioId, createdById, assignedLawyerId: createdById } });
    }
    tokens = Object.fromEntries((await prisma.user.findMany()).map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    app = express();
    app.use(express.json());
    app.use('/api/expenses', (await import('../routes/expenseRoutes.js')).default);
    app.use('/api/cases', (await import('../routes/caseRoutes.js')).default);
    app.use((await import('../middleware/errorMiddleware.js')).errorHandler);
}, 30000);

afterAll(async () => {
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-expenses-')) {
        throw new Error('Unexpected test directory');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Gastos y comprobantes privados con SQLite y archivos reales', () => {
    it('guarda el gasto, el archivo y la notificación; descarga los mismos bytes con otra sesión', async () => {
        const result = await create();
        expect(result.status).toBe(201);
        const expense = result.body;
        expect(expense).toMatchObject({ amount: 123.45, caseId: 'case-a', receiptStatus: 'AVAILABLE', status: 'PENDING' });
        expect(expense.receipt).toMatchObject({ name: 'comprobante.pdf', caseId: 'case-a' });
        expect(expense.receiptUrl).toBe(`/api/cases/files/${expense.receipt.id}/download`);
        expect(readFileSync(path.join(storage, expense.receipt.id))).toEqual(pdf);
        expect(await prisma.notification.count({ where: { caseId: 'case-a', type: 'EXPENSE' } })).toBe(1);
        await prisma.$disconnect();
        tokens.a = jwt.sign({ id: 'a' }, process.env.JWT_SECRET);
        const listed = await auth('get', '/api/expenses/case/case-a');
        expect(listed.body.expenses.find(item => item.id === expense.id).receiptStatus).toBe('AVAILABLE');
        const download = await auth('get', expense.receiptUrl).buffer(true).parse(binary);
        expect(download.status).toBe(200);
        expect(download.body).toEqual(pdf);
        expect(download.headers['content-type']).toContain('application/pdf');
        expect(download.headers['cache-control']).toContain('no-store');
        expect(download.headers['content-disposition']).toContain('attachment');
    });

    it('permite crear un gasto sin archivo tanto con JSON como con multipart', async () => {
        expect((await create('case-a', 'a', null)).body).toMatchObject({ receipt: null, receiptStatus: 'NONE', receiptUrl: null });
        const result = await auth('post', '/api/expenses/case/case-a').send({ description: 'Movilidad', amount: 0.50 });
        expect(result.status).toBe(201);
        expect(result.body).toMatchObject({ amount: 0.50, type: 'OTROS', receiptStatus: 'NONE' });
        const list = await auth('get', '/api/expenses/case/case-a');
        expect(list.body.total).toBe(list.body.expenses.reduce((sum, item) => sum + item.amount, 0));
    });

    it('exige autenticación y rechaza cuentas inactivas', async () => {
        const expense = (await create()).body;
        expect((await request(app).post('/api/expenses/case/case-a').attach('file', pdf, 'a.pdf')).status).toBe(401);
        expect((await request(app).get(expense.receiptUrl)).status).toBe(401);
        expect((await request(app).post(`/api/expenses/${expense.id}/receipt`).attach('file', pdf, 'a.pdf')).status).toBe(401);
        expect((await create('case-a', 'inactive')).status).toBe(401);
    });

    it.each([['b', 'case-a', 'a'], ['solo', 'case-a', 'a'], ['solo2', 'case-solo', 'solo'], ['a', 'case-solo', 'solo']])(
        '%s no puede consultar ni alterar gastos o comprobantes de %s', async (user, caseId, owner) => {
            const expense = (await create(caseId, owner)).body;
            const before = await snapshot();
            expect((await auth('get', `/api/expenses/case/${caseId}`, user)).status).toBe(404);
            expect((await create(caseId, user)).status).toBe(404);
            expect((await auth('put', `/api/expenses/${expense.id}`, user).send({ amount: 10 })).status).toBe(404);
            expect((await attach(expense, user)).status).toBe(404);
            expect((await auth('get', expense.receiptUrl, user)).status).toBe(404);
            expect(await snapshot()).toEqual(before);
        });

    it.each(['operator', 'super'])('mantiene el acceso autorizado para %s', async user => {
        const result = await create('case-a', user);
        expect(result.status).toBe(201);
        expect((await auth('get', result.body.receiptUrl, user)).status).toBe(200);
        expect((await auth('put', `/api/expenses/${result.body.id}`, user).send({ status: 'PAID' })).body.status).toBe('PAID');
    });

    it('bloquea gastos y descargas de un expediente eliminado', async () => {
        await prisma.case.create({ data: { id: 'deleted', title: 'Eliminado', caseNumber: 'deleted', studioId: 'a', createdById: 'a' } });
        const expense = (await create('deleted')).body;
        await prisma.case.update({ where: { id: 'deleted' }, data: { deletedAt: new Date() } });
        const before = await snapshot();
        for (const user of ['a', 'super']) {
            expect((await auth('get', '/api/expenses/case/deleted', user)).status).toBe(404);
            expect((await create('deleted', user)).status).toBe(404);
            expect((await attach(expense, user)).status).toBe(404);
            expect((await auth('put', `/api/expenses/${expense.id}`, user).send({ status: 'PAID' })).status).toBe(404);
            expect((await auth('get', expense.receiptUrl, user)).status).toBe(404);
        }
        expect(await snapshot()).toEqual(before);
    });

    it('rechaza URLs inventadas tanto al crear como al editar', async () => {
        const expense = (await create()).body;
        const before = await snapshot();
        expect((await auth('post', '/api/expenses/case/case-a').send({ description: 'Otro', amount: 1, receiptUrl: 'https://storage.lyp.com/falso.pdf' })).status).toBe(400);
        expect((await auth('put', `/api/expenses/${expense.id}`).send({ receiptUrl: expense.receiptUrl })).status).toBe(400);
        expect(await snapshot()).toEqual(before);
    });

    it('identifica comprobantes anteriores y permite cargar su archivo real', async () => {
        const expense = await prisma.expense.create({ data: { description: 'Anterior', amount: 10, caseId: 'case-a', receiptUrl: 'https://storage.lyp.com/falso.pdf' } });
        const list = await auth('get', '/api/expenses/case/case-a');
        const legacy = list.body.expenses.find(item => item.id === expense.id);
        expect(legacy).toMatchObject({ receipt: null, receiptStatus: 'LEGACY' });
        const result = await attach(legacy);
        expect(result.status).toBe(200);
        expect(result.body.receiptStatus).toBe('AVAILABLE');
        expect(readFileSync(path.join(storage, result.body.receipt.id))).toEqual(pdf);
    });

    it('protege el comprobante vinculado; conserva el anterior al reemplazar y permite borrarlo después', async () => {
        const expense = (await create()).body;
        const original = expense.receipt;
        expect((await auth('delete', `/api/cases/files/${original.id}`)).status).toBe(409);
        const replacement = await attach(expense);
        expect(replacement.status).toBe(200);
        expect(replacement.body.receipt.id).not.toBe(original.id);
        expect(readFileSync(path.join(storage, original.id))).toEqual(pdf);
        expect((await auth('delete', `/api/cases/files/${original.id}`)).status).toBe(200);
        expect((await auth('delete', `/api/cases/files/${replacement.body.receipt.id}`)).status).toBe(409);
        expect((await auth('get', replacement.body.receiptUrl)).status).toBe(200);
    });

    it('rechaza una versión antigua sin sobrescribir el comprobante ni dejar archivos huérfanos', async () => {
        const expense = (await create()).body;
        const current = (await attach(expense)).body;
        const before = await snapshot();
        expect((await attach(expense)).status).toBe(409);
        expect(await snapshot()).toEqual(before);
        expect((await prisma.expense.findUnique({ where: { id: expense.id } })).receiptUrl).toBe(current.receiptUrl);
    });

    it('si falta el contenido físico, informa que no está disponible y permite reemplazarlo', async () => {
        const expense = (await create()).body;
        unlinkSync(path.join(storage, expense.receipt.id));
        const list = await auth('get', '/api/expenses/case/case-a');
        const missing = list.body.expenses.find(item => item.id === expense.id);
        expect(missing.receiptStatus).toBe('MISSING');
        expect((await auth('get', expense.receiptUrl)).status).toBe(404);
        expect((await attach(missing)).body.receiptStatus).toBe('AVAILABLE');
    });

    it.each([['vacío.pdf', Buffer.alloc(0), 400], ['falso.pdf', Buffer.from('No es PDF'), 415], ['programa.exe', pdf, 415]])(
        'rechaza %s y limpia el almacenamiento', async (filename, bytes, status) => {
            const before = await snapshot();
            expect((await create('case-a', 'a', bytes, filename)).status).toBe(status);
            expect(await snapshot()).toEqual(before);
        });

    it('rechaza archivos de más de 20 MB sin crear registros ni conservar contenido parcial', async () => {
        const before = await snapshot();
        const bytes = Buffer.alloc(20 * 1024 * 1024 + 1, 'a'); pdf.copy(bytes);
        expect((await create('case-a', 'a', bytes)).status).toBe(413);
        expect(await snapshot()).toEqual(before);
    }, 15000);

    it('un fallo después de escribir en la transacción revierte gasto, archivo y notificación y limpia los bytes', async () => {
        const before = await snapshot();
        const transaction = prisma.$transaction.bind(prisma);
        const spy = vi.spyOn(prisma, '$transaction').mockImplementationOnce(handler => transaction(async tx => {
            await handler(tx);
            throw new Error('Simulated failure before commit');
        }));
        try { expect((await create()).status).toBe(500); }
        finally { spy.mockRestore(); }
        expect(await snapshot()).toEqual(before);
    });

    it('un cambio de estudio durante la carga retira el permiso antes de guardar', async () => {
        const before = await snapshot();
        const transaction = prisma.$transaction.bind(prisma);
        const spy = vi.spyOn(prisma, '$transaction').mockImplementationOnce(async handler => {
            await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'b' } });
            return transaction(handler);
        });
        try { expect((await create('case-a', 'operator')).status).toBe(404); }
        finally { spy.mockRestore(); await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'a' } }); }
        expect(await snapshot()).toEqual(before);
    });

    it('si falla el reemplazo, conserva el comprobante anterior y limpia la nueva carga', async () => {
        const expense = (await create()).body;
        const before = await snapshot();
        const transaction = prisma.$transaction.bind(prisma);
        const spy = vi.spyOn(prisma, '$transaction').mockImplementationOnce(handler => transaction(async tx => {
            await handler(tx);
            throw new Error('Simulated replacement failure');
        }));
        try { expect((await attach(expense)).status).toBe(500); }
        finally { spy.mockRestore(); }
        expect(await snapshot()).toEqual(before);
        expect((await prisma.expense.findUnique({ where: { id: expense.id } })).receiptUrl).toBe(expense.receiptUrl);
        expect((await auth('get', expense.receiptUrl)).status).toBe(200);
    });

    it('si el almacenamiento no admite escritura, no registra un gasto con un comprobante ficticio', async () => {
        const expense = (await create()).body;
        const before = await snapshot();
        process.env.CASE_FILES_DIR = path.join(storage, expense.receipt.id);
        try { expect((await create()).status).toBe(500); }
        finally { process.env.CASE_FILES_DIR = storage; }
        expect(await snapshot()).toEqual(before);
    });

    it('rechaza más de un archivo y campos de más sin conservar cargas parciales', async () => {
        const before = await snapshot();
        expect((await create().attach('file', pdf, 'segundo.pdf')).status).toBe(400);
        expect((await create().field('receiptUrl', 'https://storage.lyp.com/falso.pdf')).status).toBe(400);
        expect(await snapshot()).toEqual(before);
    });

    it.each([{ amount: -1 }, { amount: 'Infinity' }, { amount: [] }, { description: ' ' }, { type: 'INVALID' }])(
        'rechaza datos inválidos sin guardar el archivo: %j', async body => {
            const expense = (await create()).body;
            const before = await snapshot();
            const req = auth('post', '/api/expenses/case/case-a');
            const fields = { description: 'Gasto', amount: '1', type: 'OTROS', ...body };
            for (const [key, value] of Object.entries(fields)) req.field(key, Array.isArray(value) ? '' : String(value));
            expect((await req.attach('file', pdf, 'a.pdf')).status).toBe(400);
            expect((await auth('put', `/api/expenses/${expense.id}`).send(body)).status).toBe(400);
            expect(await snapshot()).toEqual(before);
        });
});
