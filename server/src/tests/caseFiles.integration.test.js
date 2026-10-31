import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-case-files-'));
const storage = path.join(directory, 'private-files');
const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET', 'CASE_FILES_DIR'].map(key => [key, process.env[key]]));
const pdf = Buffer.from('%PDF-1.4\nContenido de prueba de almacenamiento\n%%EOF\n');
let prisma, app, tokens;
const auth = (method, url, user = 'a') => request(app)[method](url).set('Authorization', `Bearer ${tokens[user]}`);
const sendFile = (caseId = 'case-a', user = 'a', bytes = pdf, filename = 'documento.pdf', contentType = 'application/pdf') =>
    auth('post', `/api/cases/${caseId}/files`, user).attach('file', bytes, { filename, contentType });
const createFile = async (caseId = 'case-a', user = 'a') => {
    const result = await sendFile(caseId, user);
    expect(result.status).toBe(201);
    return result.body;
};
const binary = (res, done) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => done(null, Buffer.concat(chunks)));
    res.on('error', done);
};

beforeAll(async () => {
    mkdirSync(storage);
    process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
    process.env.CASE_FILES_DIR = storage;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    const schema = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const sql of schema.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql);
    for (const id of ['a', 'b']) await prisma.studio.create({ data: { id, name: `Estudio ${id}`, cuit: id } });
    for (const [id, studioId, role] of [['a', 'a', 'LAWYER'], ['operator', 'a', 'OPERATOR'], ['b', 'b', 'LAWYER'],
        ['solo', null, 'LAWYER'], ['solo2', null, 'LAWYER'], ['super', null, 'SUPER_ADMIN'], ['inactive', 'a', 'LAWYER']]) {
        await prisma.user.create({ data: { id, studioId, role, name: id, email: `${id}@test.invalid`, password: 'unused',
            ...(id === 'inactive' ? { deletedAt: new Date() } : {}) } });
    }
    for (const [id, studioId, createdById] of [['case-a', 'a', 'a'], ['case-b', 'b', 'b'], ['case-solo', null, 'solo'], ['deleted', 'a', 'a']]) {
        await prisma.case.create({ data: { id, studioId, createdById, caseNumber: id, title: id,
            ...(id === 'deleted' ? { deletedAt: new Date() } : {}) } });
    }
    tokens = Object.fromEntries((await prisma.user.findMany()).map(user => [user.id, jwt.sign({ id: user.id }, process.env.JWT_SECRET)]));
    app = express();
    app.use(express.json());
    app.use('/api/cases', (await import('../routes/caseRoutes.js')).default);
    app.use('/api/documents', (await import('../routes/documentRoutes.js')).default);
    app.use('/api/jurisprudencia', (await import('../routes/jurisprudenceRoutes.js')).default);
    app.use('/api/fees', (await import('../routes/feeRoutes.js')).default);
    app.use((await import('../middleware/errorMiddleware.js')).errorHandler);
}, 30000);

afterAll(async () => {
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-case-files-')) {
        throw new Error('Unexpected test directory');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Archivos privados del expediente con SQLite y almacenamiento reales', () => {
    it('guarda los bytes y los descarga después de reconectar a la base y renovar la sesión', async () => {
        const file = await createFile();
        expect(file.name).toBe('documento.pdf');
        expect(file.url).toBe(`/api/cases/files/${file.id}/download`);
        expect(readFileSync(path.join(storage, file.id))).toEqual(pdf);
        await prisma.$disconnect();
        tokens.a = jwt.sign({ id: 'a' }, process.env.JWT_SECRET);
        const listed = await auth('get', '/api/cases/case-a');
        expect(listed.body.files.map(item => item.id)).toContain(file.id);
        const download = await auth('get', file.url).buffer(true).parse(binary);
        expect(download.status).toBe(200);
        expect(download.body).toEqual(pdf);
        expect(download.headers['content-type']).toMatch(/^application\/pdf/);
        expect(download.headers['content-disposition']).toMatch(/^attachment;/);
        expect(download.headers['cache-control']).toContain('no-store');
        expect(download.headers['x-content-type-options']).toBe('nosniff');
        expect((await auth('get', file.url, 'operator')).status).toBe(200);
        expect((await auth('get', file.url, 'super')).status).toBe(200);
    });

    it('evita acceso sin sesión, cuentas inactivas y rutas de archivos públicas', async () => {
        const file = await createFile();
        expect((await request(app).get(file.url)).status).toBe(401);
        expect((await auth('get', file.url, 'inactive')).status).toBe(401);
        expect((await request(app).get(`/uploads/${file.id}`)).status).toBe(404);
        const before = readdirSync(storage).length;
        expect((await request(app).post('/api/cases/case-a/files').attach('file', pdf, 'no.pdf')).status).toBe(401);
        expect(readdirSync(storage)).toHaveLength(before);
    });

    it.each(['b', 'solo', 'solo2'])('bloquea lectura, escritura y borrado ajenos antes de guardar contenido: %s', async (user) => {
        const file = await createFile();
        const before = readdirSync(storage).length;
        expect((await sendFile('case-a', user)).status).toBe(404);
        expect((await auth('get', file.url, user)).status).toBe(404);
        expect((await auth('delete', `/api/cases/files/${file.id}`, user)).status).toBe(404);
        expect(readdirSync(storage)).toHaveLength(before);
        expect(readFileSync(path.join(storage, file.id))).toEqual(pdf);
    });

    it('limita los expedientes independientes a su titular', async () => {
        const file = await createFile('case-solo', 'solo');
        expect((await auth('get', file.url, 'solo')).status).toBe(200);
        expect((await auth('get', file.url, 'solo2')).status).toBe(404);
        expect((await sendFile('case-solo', 'solo2')).status).toBe(404);
        expect((await auth('delete', `/api/cases/files/${file.id}`, 'solo2')).status).toBe(404);
    });

    it('bloquea expedientes eliminados y retira el acceso si un usuario cambia de estudio', async () => {
        expect((await sendFile('deleted')).status).toBe(404);
        const file = await createFile();
        await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: new Date() } });
        expect((await auth('get', file.url, 'super')).status).toBe(404);
        expect((await auth('delete', `/api/cases/files/${file.id}`, 'super')).status).toBe(404);
        await prisma.case.update({ where: { id: 'case-a' }, data: { deletedAt: null } });
        await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'b' } });
        expect((await auth('get', file.url, 'operator')).status).toBe(404);
        await prisma.user.update({ where: { id: 'operator' }, data: { studioId: 'a' } });
    });

    it('rechaza JSON con una URL simulada y formularios sin archivo', async () => {
        expect((await auth('post', '/api/cases/case-a/files').send({ name: 'falso.pdf', url: 'https://storage.lyp.com/falso.pdf' })).status).toBe(400);
        expect((await auth('post', '/api/cases/case-a/files').send({})).status).toBe(400);
    });

    it.each([
        ['ejecutable.exe', 'application/octet-stream', Buffer.from('MZfile')],
        ['documento.pdf', 'application/pdf', Buffer.from('<html>incorrecto</html>')],
        ['documento.pdf', 'text/html', pdf],
        ['vacio.pdf', 'application/pdf', Buffer.alloc(0)],
    ])('valida tipo, firma y archivos vacíos sin dejar datos huérfanos: %s', async (filename, type, bytes) => {
        const before = readdirSync(storage).sort();
        const count = await prisma.caseFile.count();
        const result = await sendFile('case-a', 'a', bytes, filename, type);
        expect([400, 415]).toContain(result.status);
        expect(readdirSync(storage).sort()).toEqual(before);
        expect(await prisma.caseFile.count()).toBe(count);
    });

    it('rechaza más de un archivo y campos inesperados sin dejar contenido parcial', async () => {
        const before = readdirSync(storage).sort();
        expect((await auth('post', '/api/cases/case-a/files').attach('file', pdf, 'uno.pdf').attach('file', pdf, 'dos.pdf')).status).toBe(400);
        expect((await auth('post', '/api/cases/case-a/files').field('url', 'https://example.invalid').attach('file', pdf, 'tres.pdf')).status).toBe(400);
        expect(readdirSync(storage).sort()).toEqual(before);
    });

    it('rechaza archivos que superan 20 MB y limpia la escritura parcial', async () => {
        const before = readdirSync(storage).sort();
        const bigFile = Buffer.alloc(20 * 1024 * 1024 + 1, 'a');
        pdf.copy(bigFile);
        const result = await sendFile('case-a', 'a', bigFile, 'grande.pdf');
        expect(result.status).toBe(413);
        expect(readdirSync(storage).sort()).toEqual(before);
    }, 15000);

    it('acepta PNG y Word reales, y nombres repetidos sin sobrescribir', async () => {
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWX0AAAAASUVORK5CYII=', 'base64');
        expect((await sendFile('case-a', 'a', png, 'imagen.png', 'image/png')).status).toBe(201);
        const { generateDocument } = await import('../skills/documentRedactor.js');
        const word = await generateDocument({ title: 'Prueba', caseNumber: 'DOC-1' }, 'escrito');
        expect((await sendFile('case-a', 'a', word, 'escrito.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).status).toBe(201);
        const first = await createFile();
        const second = await createFile();
        expect(first.id).not.toBe(second.id);
        expect(readFileSync(path.join(storage, first.id))).toEqual(readFileSync(path.join(storage, second.id)));
    });

    it('limpia el archivo si falla la transacción de metadatos', async () => {
        const before = readdirSync(storage).sort();
        const spy = vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('Simulated database outage'));
        try { expect((await sendFile()).status).toBe(500); }
        finally { spy.mockRestore(); }
        expect(readdirSync(storage).sort()).toEqual(before);
    });

    it('conserva los registros anteriores y no los presenta como cargas privadas', async () => {
        const legacy = await prisma.caseFile.create({ data: { name: 'anterior.pdf', url: 'https://storage.lyp.com/mock.pdf', caseId: 'case-a' } });
        const listed = await auth('get', '/api/cases/case-a');
        expect(listed.body.files.find(item => item.id === legacy.id)).toMatchObject({ url: legacy.url });
        expect((await auth('get', `/api/cases/files/${legacy.id}/download`)).status).toBe(409);
        const before = readdirSync(storage).sort();
        expect((await auth('delete', `/api/cases/files/${legacy.id}`)).status).toBe(200);
        expect(readdirSync(storage).sort()).toEqual(before);
    });

    it('devuelve 404 si falta el contenido físico y permite quitar el registro', async () => {
        const file = await createFile();
        unlinkSync(path.join(storage, file.id));
        expect((await auth('get', file.url)).status).toBe(404);
        expect((await auth('delete', `/api/cases/files/${file.id}`)).status).toBe(200);
    });

    it('elimina el contenido y los metadatos de un archivo propio', async () => {
        const file = await createFile();
        expect((await auth('delete', `/api/cases/files/${file.id}`)).body.cleanupPending).toBe(false);
        expect(await prisma.caseFile.findUnique({ where: { id: file.id } })).toBeNull();
        expect(readdirSync(storage)).not.toContain(file.id);
        expect((await auth('get', file.url)).status).toBe(404);
    });
});

describe('Honorarios: acuerdos, saldo y pagos con SQLite real', () => {
    const plan = () => ({ description: 'Acuerdo ficticio', installments: [
        { amount: '100.25', dueDate: '2020-01-10' }, { amount: '50.10', dueDate: '2099-01-10' },
    ] });
    const agreement = async (user = 'a') => {
        const id = randomUUID();
        await prisma.case.create({ data: { id, caseNumber: id, title: 'Honorarios', createdById: user,
            studioId: user === 'a' ? 'a' : null } });
        const response = await auth('post', '/api/fees/case/' + id, user).send(plan());
        expect(response.status).toBe(201);
        return response.body;
    };
    const payment = (item, amount, requestId = randomUUID(), user = 'a') => auth('post', '/api/fees/installments/' + item.id + '/payments', user)
        .send({ amount, paidAt: '2026-10-28', notes: 'Pago ficticio', requestId });

    it('conserva centavos exactos, historial, pagos parciales y saldo después de reconectar', async () => {
        let saved = await agreement();
        expect(saved).toMatchObject({ totalCents: 15035, paidCents: 0, balanceCents: 15035 });
        const first = saved.installments[0];
        const result = await payment(first, '40.10');
        expect(result.status).toBe(200);
        saved = result.body;
        expect(saved).toMatchObject({ paidCents: 4010, balanceCents: 11025 });
        expect(saved.installments[0]).toMatchObject({ status: 'PARTIAL', balanceCents: 6015 });
        expect(saved.installments[0].payments[0]).toMatchObject({ registeredById: 'a', amountCents: 4010 });
        await prisma.$disconnect();
        expect((await auth('get', '/api/fees/case/' + saved.caseId)).body).toEqual(saved);
    });

    it('reintenta el mismo pago sin duplicarlo y rechaza cambiar su contenido', async () => {
        const saved = await agreement(); const item = saved.installments[0]; const id = randomUUID();
        expect((await payment(item, '10.20', id)).status).toBe(200);
        const again = await payment(item, '10.20', id);
        expect(again.body.paidCents).toBe(1020);
        expect(again.body.installments[0].payments).toHaveLength(1);
        expect((await payment(item, '20.20', id)).status).toBe(409);
        expect((await payment(item, '100.00')).status).toBe(409);
        expect(await prisma.feePayment.count({ where: { installmentId: item.id } })).toBe(1);
    });

    it('retira cuotas pagadas de los pendientes y conserva las futuras en el expediente', async () => {
        const saved = await agreement(); const item = saved.installments[0];
        expect((await auth('get', '/api/fees/upcoming')).body.find(row => row.id === item.id).balanceCents).toBe(10025);
        await payment(item, '25.25');
        expect((await auth('get', '/api/fees/upcoming')).body.find(row => row.id === item.id).balanceCents).toBe(7500);
        await payment(item, '75.00');
        const pending = (await auth('get', '/api/fees/upcoming')).body;
        expect(pending.some(row => saved.installments.some(quota => quota.id === row.id))).toBe(false);
        const current = (await auth('get', '/api/fees/case/' + saved.caseId)).body;
        expect(current.installments[0].payments).toHaveLength(2);
        expect(current.installments[0].status).toBe('PAID');
        expect(current.balanceCents).toBe(5010);
    });

    it('dos pagos concurrentes no pueden superar el saldo', async () => {
        const saved = await agreement();
        const results = await Promise.all([payment(saved.installments[0], '70.00'), payment(saved.installments[0], '70.00')]);
        expect(results.map(result => result.status).sort()).toEqual([200, 409]);
        const current = (await auth('get', '/api/fees/case/' + saved.caseId)).body;
        expect(current.paidCents).toBe(7000);
        expect(current.installments[0].payments).toHaveLength(1);
    }, 20000);

    it('bloquea accesos entre estudios, independientes, eliminados y sin sesión', async () => {
        const saved = await agreement('solo');
        for (const user of ['solo2', 'a', 'b']) {
            expect((await auth('get', '/api/fees/case/' + saved.caseId, user)).status).toBe(404);
            expect((await payment(saved.installments[0], '1.00', randomUUID(), user)).status).toBe(404);
            expect((await auth('get', '/api/fees/upcoming', user)).body.some(row => row.id === saved.installments[0].id)).toBe(false);
        }
        expect((await request(app).get('/api/fees/case/' + saved.caseId)).status).toBe(401);
        await prisma.case.update({ where: { id: saved.caseId }, data: { deletedAt: new Date() } });
        expect((await auth('get', '/api/fees/case/' + saved.caseId, 'super')).status).toBe(404);
    });

    it('permite consultar al operador pero reserva el registro a abogados y administradores', async () => {
        const saved = await agreement();
        expect((await auth('post', '/api/fees/installments/' + saved.installments[0].id + '/payments').send({ amount: '1', paidAt: '2099-01-01', requestId: randomUUID() })).status).toBe(400);
        expect((await auth('get', '/api/fees/case/' + saved.caseId, 'operator')).status).toBe(200);
        expect((await auth('post', '/api/fees/case/case-a', 'operator').send(plan())).status).toBe(403);
        expect((await payment(saved.installments[0], '1.00', randomUUID(), 'operator')).status).toBe(403);
        expect((await auth('post', '/api/fees/case/' + saved.caseId).send(plan())).status).toBe(409);
    });

    it.each(['0', '-1', '1.001', 'Infinity', '1e3', '20000000.01', {}, 12])('rechaza importes inválidos sin crear acuerdo: %j', async amount => {
        const id = randomUUID();
        await prisma.case.create({ data: { id, caseNumber: id, title: 'Prueba', createdById: 'a', studioId: 'a' } });
        expect((await auth('post', '/api/fees/case/' + id).send({ ...plan(), installments: [{ amount, dueDate: '2026-10-28' }] })).status).toBe(400);
        expect(await prisma.feeAgreement.findUnique({ where: { caseId: id } })).toBeNull();
    });

    it('rechaza fechas inválidas y planes sin cuotas', async () => {
        for (const installments of [[], [{ amount: '10', dueDate: '2026-02-30' }], [{ amount: '10', dueDate: '2026-10-28T00:00:00Z' }]]) {
            expect((await auth('post', '/api/fees/case/case-a').send({ description: 'Prueba', installments })).status).toBe(400);
        }
        const saved = await agreement();
        expect((await auth('post', '/api/fees/installments/' + saved.installments[0].id + '/payments').send({ amount: '1', paidAt: 'bad', requestId: randomUUID() })).status).toBe(400);
        expect(await prisma.feePayment.count({ where: { installmentId: saved.installments[0].id } })).toBe(0);
    });
});

describe('Anulación de pagos: saldo, historial e integridad con SQLite real', () => {
    const createAgreement = async (user = 'a') => {
        const id = randomUUID();
        await prisma.case.create({ data: { id, caseNumber: id, title: 'Anulación ficticia', createdById: user,
            studioId: user === 'a' ? 'a' : null } });
        const response = await auth('post', '/api/fees/case/' + id, user).send({ description: 'Acuerdo para rectificar pagos',
            installments: [{ amount: '100.25', dueDate: '2020-01-10' }] });
        expect(response.status).toBe(201);
        return response.body;
    };
    const pay = async (agreement, amount = '100.25', user = 'a') => {
        const body = { amount, paidAt: '2020-01-10', notes: 'Pago original', requestId: randomUUID() };
        const response = await auth('post', '/api/fees/installments/' + agreement.installments[0].id + '/payments', user).send(body);
        expect(response.status).toBe(200);
        return { agreement: response.body, payment: response.body.installments[0].payments.at(-1), body };
    };
    const reverse = (id, body = { reason: 'Importe ingresado por error', requestId: randomUUID() }, user = 'a') =>
        auth('post', '/api/fees/payments/' + id + '/reversal', user).send(body);
    const current = async agreement => (await auth('get', '/api/fees/case/' + agreement.caseId)).body;
    const assertLedger = agreement => {
        for (const item of agreement.installments) {
            const active = item.payments.filter(entry => !entry.reversal).reduce((sum, entry) => sum + entry.amountCents, 0);
            expect(item.paidCents).toBe(active);
            expect(item.balanceCents).toBe(item.amountCents - active);
            expect(item.paidCents).toBeGreaterThanOrEqual(0);
            expect(item.paidCents).toBeLessThanOrEqual(item.amountCents);
        }
    };

    it('anula un pago completo sin modificarlo, conserva autor y motivo y persiste tras reconectar', async () => {
        const original = await pay(await createAgreement());
        const before = await prisma.feePayment.findUnique({ where: { id: original.payment.id } });
        const result = await reverse(original.payment.id);
        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({ totalCents: 10025, paidCents: 0, balanceCents: 10025 });
        const item = result.body.installments[0];
        expect(item.status).toBe('PENDING');
        expect(item.payments).toHaveLength(1);
        expect(item.payments[0]).toMatchObject({ id: original.payment.id, amountCents: 10025,
            reversal: { paymentId: original.payment.id, reason: 'Importe ingresado por error', registeredById: 'a', registeredByName: 'a' } });
        expect(Number.isFinite(Date.parse(item.payments[0].reversal.createdAt))).toBe(true);
        expect(await prisma.feePayment.findUnique({ where: { id: original.payment.id } })).toEqual(before);
        assertLedger(result.body);
        await prisma.$disconnect();
        expect(await current(original.agreement)).toEqual(result.body);
    });

    it('reabre el pendiente y conserva otros pagos parciales y el saldo exacto del recordatorio', async () => {
        const first = await pay(await createAgreement(), '40.10');
        const second = await pay(first.agreement, '25.25');
        const result = await reverse(first.payment.id);
        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({ paidCents: 2525, balanceCents: 7500 });
        expect(result.body.installments[0].status).toBe('PARTIAL');
        expect(result.body.installments[0].payments).toHaveLength(2);
        expect(result.body.installments[0].payments.find(entry => entry.id === second.payment.id).reversal).toBeNull();
        const upcoming = (await auth('get', '/api/fees/upcoming')).body.find(item => item.id === first.agreement.installments[0].id);
        expect(upcoming.balanceCents).toBe(7500);
        assertLedger(result.body);
    });

    it('reintenta la misma anulación normalizando espacios sin volver a disminuir lo pagado', async () => {
        const original = await pay(await createAgreement(), '60.00');
        const requestId = randomUUID();
        const first = await reverse(original.payment.id, { reason: '  Error de carga  ', requestId });
        const retry = await reverse(original.payment.id, { reason: 'Error de carga', requestId });
        expect(first.status).toBe(200); expect(retry.status).toBe(200);
        expect(retry.body).toEqual(first.body);
        expect(await prisma.feePaymentReversal.count({ where: { paymentId: original.payment.id } })).toBe(1);
        assertLedger(retry.body);
    });

    it('rechaza una segunda anulación con otro identificador o motivo sin alterar la primera', async () => {
        const original = await pay(await createAgreement(), '60.00');
        const body = { reason: 'Error documentado', requestId: randomUUID() };
        const first = await reverse(original.payment.id, body);
        expect(first.status).toBe(200);
        expect((await reverse(original.payment.id, { ...body, requestId: randomUUID() })).status).toBe(409);
        expect((await reverse(original.payment.id, { ...body, reason: 'Otro motivo' })).status).toBe(409);
        expect(await current(original.agreement)).toEqual(first.body);
        expect(await prisma.feePaymentReversal.count({ where: { paymentId: original.payment.id } })).toBe(1);
    });

    it('un reintento tardío del pago original no revive un pago anulado', async () => {
        const original = await pay(await createAgreement(), '60.00');
        expect((await reverse(original.payment.id)).status).toBe(200);
        const result = await auth('post', '/api/fees/installments/' + original.agreement.installments[0].id + '/payments').send(original.body);
        expect(result.status).toBe(409);
        const resultAfter = await current(original.agreement);
        expect(resultAfter.paidCents).toBe(0);
        expect(resultAfter.installments[0].payments).toHaveLength(1);
        expect(resultAfter.installments[0].payments[0].reversal).toBeTruthy();
        assertLedger(resultAfter);
    });

    it('exige un motivo válido y no modifica el saldo ante entradas inválidas', async () => {
        const original = await pay(await createAgreement(), '60.00');
        for (const reason of [undefined, null, '', '  ', 42, {}, 'x'.repeat(2001)]) {
            expect((await reverse(original.payment.id, { reason, requestId: randomUUID() })).status).toBe(400);
        }
        const result = await current(original.agreement);
        expect(result.paidCents).toBe(6000);
        expect(result.installments[0].payments[0].reversal).toBeNull();
        assertLedger(result);
    });

    it('exige un identificador UUIDv4 y no crea anulaciones parciales', async () => {
        const original = await pay(await createAgreement(), '60.00');
        for (const requestId of [undefined, '', 'not-a-uuid', 12, '00000000-0000-1000-8000-000000000000']) {
            expect((await reverse(original.payment.id, { reason: 'Error', requestId })).status).toBe(400);
        }
        expect(await prisma.feePaymentReversal.count({ where: { paymentId: original.payment.id } })).toBe(0);
        expect((await current(original.agreement)).paidCents).toBe(6000);
    });

    it('bloquea anulaciones ajenas entre estudios y titulares independientes', async () => {
        const studio = await pay(await createAgreement(), '60.00');
        expect((await reverse(studio.payment.id, undefined, 'b')).status).toBe(404);
        const solo = await pay(await createAgreement('solo'), '60.00', 'solo');
        for (const user of ['solo2', 'a', 'b']) expect((await reverse(solo.payment.id, undefined, user)).status).toBe(404);
        expect((await prisma.feeInstallment.findUnique({ where: { id: studio.agreement.installments[0].id } })).paidCents).toBe(6000);
        expect((await prisma.feeInstallment.findUnique({ where: { id: solo.agreement.installments[0].id } })).paidCents).toBe(6000);
        expect((await reverse(solo.payment.id, undefined, 'super')).status).toBe(200);
    });

    it('rechaza sesiones ausentes, inactivas y operadores y permite al administrador del estudio', async () => {
        const original = await pay(await createAgreement(), '60.00');
        const route = '/api/fees/payments/' + original.payment.id + '/reversal';
        const body = { reason: 'Error confirmado', requestId: randomUUID() };
        expect((await request(app).post(route).send(body)).status).toBe(401);
        expect((await reverse(original.payment.id, body, 'inactive')).status).toBe(401);
        expect((await reverse(original.payment.id, body, 'operator')).status).toBe(403);
        const id = randomUUID();
        await prisma.user.create({ data: { id, studioId: 'a', role: 'ADMIN', name: 'Administradora de prueba', email: id + '@test.invalid', password: 'unused' } });
        tokens[id] = jwt.sign({ id }, process.env.JWT_SECRET);
        const result = await reverse(original.payment.id, body, id);
        expect(result.status).toBe(200);
        expect(result.body.installments[0].payments[0].reversal).toMatchObject({ registeredById: id, registeredByName: 'Administradora de prueba' });
    });

    it('revoca el permiso con el rol o estudio actual de la cuenta y excluye expedientes eliminados', async () => {
        const original = await pay(await createAgreement(), '60.00');
        try {
            await prisma.user.update({ where: { id: 'a' }, data: { role: 'OPERATOR' } });
            expect((await reverse(original.payment.id)).status).toBe(403);
            await prisma.user.update({ where: { id: 'a' }, data: { role: 'LAWYER', studioId: 'b' } });
            expect((await reverse(original.payment.id)).status).toBe(404);
        } finally { await prisma.user.update({ where: { id: 'a' }, data: { role: 'LAWYER', studioId: 'a' } }); }
        await prisma.case.update({ where: { id: original.agreement.caseId }, data: { deletedAt: new Date() } });
        expect((await reverse(original.payment.id, undefined, 'super')).status).toBe(404);
        expect(await prisma.feePaymentReversal.count({ where: { paymentId: original.payment.id } })).toBe(0);
    });

    it('dos anulaciones simultáneas de un pago descuentan su importe una sola vez', async () => {
        const original = await pay(await createAgreement(), '60.00');
        const responses = await Promise.all([reverse(original.payment.id), reverse(original.payment.id)]);
        expect(responses.map(item => item.status).sort()).toEqual([200, 409]);
        const result = await current(original.agreement);
        expect(result.paidCents).toBe(0);
        expect(await prisma.feePaymentReversal.count({ where: { paymentId: original.payment.id } })).toBe(1);
        assertLedger(result);
    }, 20000);

    it('una anulación simultánea con un pago nuevo conserva el saldo consistente y permite reintentar', async () => {
        const original = await pay(await createAgreement(), '60.00');
        const reversal = { reason: 'Rectificación concurrente', requestId: randomUUID() };
        const paymentBody = { amount: '40.25', paidAt: '2020-01-10', notes: 'Otro pago', requestId: randomUUID() };
        const paymentRoute = '/api/fees/installments/' + original.agreement.installments[0].id + '/payments';
        const responses = await Promise.all([reverse(original.payment.id, reversal), auth('post', paymentRoute).send(paymentBody)]);
        for (const response of responses) expect([200, 409]).toContain(response.status);
        expect(responses.some(response => response.status === 200)).toBe(true);
        if (responses[0].status === 409) expect((await reverse(original.payment.id, reversal)).status).toBe(200);
        if (responses[1].status === 409) expect((await auth('post', paymentRoute).send(paymentBody)).status).toBe(200);
        const result = await current(original.agreement);
        expect(result).toMatchObject({ paidCents: 4025, balanceCents: 6000 });
        expect(result.installments[0].payments).toHaveLength(2);
        assertLedger(result);
    }, 20000);

    it('revierte toda la transacción si falla la escritura del historial de anulación', async () => {
        const original = await pay(await createAgreement(), '60.00');
        const trigger = 'fail_reversal_' + randomUUID().replaceAll('-', '');
        await prisma.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "FeePaymentReversal" WHEN NEW."paymentId" = '${original.payment.id}' BEGIN SELECT RAISE(ABORT, 'Simulated reversal storage failure'); END`);
        try { expect((await reverse(original.payment.id)).status).toBe(500); }
        finally { await prisma.$executeRawUnsafe(`DROP TRIGGER "${trigger}"`); }
        const result = await current(original.agreement);
        expect(result.paidCents).toBe(6000);
        expect(result.installments[0].payments[0].reversal).toBeNull();
        expect(await prisma.feePaymentReversal.count({ where: { paymentId: original.payment.id } })).toBe(0);
        assertLedger(result);
    });
});

describe('Modificación de acuerdos: versiones, cuotas e historial', () => {
    const createAgreement = async (user = 'a') => {
        const id = randomUUID();
        await prisma.case.create({ data: { id, caseNumber: id, title: 'Acuerdo editable ficticio', createdById: user, studioId: user === 'a' ? 'a' : null } });
        const response = await auth('post', '/api/fees/case/' + id, user).send({ description: 'Acuerdo original', installments: [
            { amount: '100.25', dueDate: '2020-01-10' }, { amount: '50.10', dueDate: '2099-01-10' },
        ] });
        expect(response.status).toBe(201);
        return response.body;
    };
    const bodyFor = agreement => ({ requestId: randomUUID(), expectedVersion: agreement.version,
        reason: 'Cambio pactado con el cliente', description: 'Acuerdo actualizado',
        installments: agreement.installments.map(item => ({ id: item.id, amount: (item.amountCents / 100).toFixed(2), dueDate: item.dueDate.slice(0, 10) })),
    });
    const amend = (agreement, body = bodyFor(agreement), user = 'a') => auth('post', '/api/fees/case/' + agreement.caseId + '/amendments', user).send(body);
    const current = async (agreement, user = 'a') => (await auth('get', '/api/fees/case/' + agreement.caseId, user)).body;
    const pay = (agreement, body = { amount: '40.10', paidAt: '2020-01-10', requestId: randomUUID() }, user = 'a') =>
        auth('post', '/api/fees/installments/' + agreement.installments[0].id + '/payments', user).send(body);

    it('modifica descripción, importe y vencimiento, agrega cuotas y conserva pagos e identidades', async () => {
        let saved = await createAgreement();
        saved = (await pay(saved)).body;
        const originalPayment = await prisma.feePayment.findUnique({ where: { id: saved.installments[0].payments[0].id } });
        const body = bodyFor(saved);
        body.installments[0] = { ...body.installments[0], amount: '125.30', dueDate: '2020-02-10' };
        body.installments.push({ amount: '25.00', dueDate: '2099-02-10' });
        const response = await amend(saved, body);
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ description: body.description, version: saved.version + 1,
            totalCents: 20040, paidCents: 4010, balanceCents: 16030 });
        expect(response.body.installments).toHaveLength(3);
        expect(response.body.installments.slice(0, 2).map(item => item.id)).toEqual(saved.installments.map(item => item.id));
        expect(response.body.installments[2]).toMatchObject({ position: 3, amountCents: 2500, paidCents: 0 });
        expect(await prisma.feePayment.findUnique({ where: { id: originalPayment.id } })).toEqual(originalPayment);
        const audit = response.body.amendments[0];
        expect(audit).toMatchObject({ requestId: body.requestId, reason: body.reason, previousVersion: saved.version,
            version: response.body.version, registeredById: 'a', registeredByName: 'a',
            before: { description: 'Acuerdo original' }, after: { description: body.description } });
        expect(audit.before.installments[0]).toMatchObject({ id: saved.installments[0].id, amountCents: 10025, paidCents: 4010 });
        expect(audit.after.installments[0]).toMatchObject({ id: saved.installments[0].id, amountCents: 12530, paidCents: 4010 });
        expect(audit.after.installments).toHaveLength(3);
        expect(Number.isFinite(Date.parse(audit.createdAt))).toBe(true);
        await prisma.$disconnect();
        expect(await current(saved)).toEqual(response.body);
    });

    it('no permite reducir una cuota por debajo de lo pagado y acepta el límite exacto', async () => {
        const saved = (await pay(await createAgreement())).body;
        const body = bodyFor(saved);
        body.installments[0].amount = '40.09';
        expect((await amend(saved, body)).status).toBe(400);
        expect(await current(saved)).toEqual(saved);
        body.requestId = randomUUID(); body.installments[0].amount = '40.10';
        const response = await amend(saved, body);
        expect(response.status).toBe(200);
        expect(response.body.installments[0]).toMatchObject({ amountCents: 4010, paidCents: 4010, balanceCents: 0, status: 'PAID' });
    });

    it('cada pago y anulación nuevos incrementan versión, pero sus reintentos no la incrementan', async () => {
        const saved = await createAgreement();
        expect(saved.version).toBe(1);
        const paymentBody = { amount: '40.10', paidAt: '2020-01-10', requestId: randomUUID() };
        const paid = await pay(saved, paymentBody);
        expect(paid.status).toBe(200); expect(paid.body.version).toBe(2);
        expect((await pay(saved, paymentBody)).body.version).toBe(2);
        expect((await amend(saved)).status).toBe(409);
        const reversalBody = { reason: 'Carga ficticia errónea', requestId: randomUUID() };
        const route = '/api/fees/payments/' + paid.body.installments[0].payments[0].id + '/reversal';
        const reversed = await auth('post', route).send(reversalBody);
        expect(reversed.status).toBe(200); expect(reversed.body.version).toBe(3);
        expect((await auth('post', route).send(reversalBody)).body.version).toBe(3);
        expect((await amend(paid.body)).status).toBe(409);
        expect((await current(saved)).paidCents).toBe(0);
    });

    it('una edición vieja no sobrescribe una modificación más reciente', async () => {
        const saved = await createAgreement();
        const first = await amend(saved);
        expect(first.status).toBe(200);
        const stale = bodyFor(saved); stale.description = 'Edición desactualizada';
        expect((await amend(saved, stale)).status).toBe(409);
        expect(await current(saved)).toEqual(first.body);
        const next = { ...bodyFor(first.body), description: 'Segunda modificación válida' };
        const second = await amend(first.body, next);
        expect(second.status).toBe(200);
        expect(second.body.amendments.map(item => item.version)).toEqual([3, 2]);
        expect(second.body.amendments[1]).toEqual(first.body.amendments[0]);
        expect(second.body.amendments[0].before.description).toBe(first.body.description);
        expect(second.body.amendments[0].after.description).toBe(next.description);
        expect(second.body.amendments[0]).not.toHaveProperty('requestData');
    });

    it('reintenta la misma solicitud normalizada sin aplicar otra vez ni borrar cambios posteriores', async () => {
        const saved = await createAgreement();
        const body = bodyFor(saved); body.reason = '  Cambio confirmado  '; body.description = '  Nuevo acuerdo  ';
        const first = await amend(saved, body);
        expect(first.status).toBe(200);
        const paid = await pay(first.body);
        expect(paid.status).toBe(200);
        const retry = await amend(saved, { ...body, reason: body.reason.trim(), description: body.description.trim() });
        expect(retry.status).toBe(200);
        expect(retry.body).toEqual(paid.body);
        expect(retry.body.amendments).toHaveLength(1);
        expect(await prisma.feeAgreementAmendment.count({ where: { agreementId: saved.id } })).toBe(1);
    });

    it('rechaza reutilizar identificador de modificación con contenido distinto', async () => {
        const saved = await createAgreement(); const body = bodyFor(saved);
        const first = await amend(saved, body);
        expect(first.status).toBe(200);
        expect((await amend(saved, { ...body, description: 'Otro acuerdo' })).status).toBe(409);
        expect((await amend(saved, { ...body, reason: 'Otro motivo' })).status).toBe(409);
        expect(await current(saved)).toEqual(first.body);
    });

    it('rechaza cambios vacíos sin incrementar versión ni crear historial', async () => {
        const saved = await createAgreement(); const body = bodyFor(saved); body.description = saved.description;
        expect((await amend(saved, body)).status).toBe(400);
        expect(await current(saved)).toEqual(saved);
    });

    it('valida motivo, descripción, versión, UUID, fechas y montos antes de guardar', async () => {
        const saved = await createAgreement();
        const invalid = [
            { reason: '' }, { reason: '  ' }, { reason: 'x'.repeat(2001) }, { reason: {} },
            { description: '' }, { description: 'x'.repeat(2001) },
            { expectedVersion: 0 }, { expectedVersion: 1.2 }, { expectedVersion: '1' },
            { requestId: 'bad-id' },
            { installments: [{ id: saved.installments[0].id, amount: '-1', dueDate: '2020-01-10' }, bodyFor(saved).installments[1]] },
            { installments: [{ id: saved.installments[0].id, amount: '1.001', dueDate: '2020-01-10' }, bodyFor(saved).installments[1]] },
            { installments: [{ id: saved.installments[0].id, amount: '20000000.01', dueDate: '2020-01-10' }, bodyFor(saved).installments[1]] },
            { installments: [{ id: saved.installments[0].id, amount: '100', dueDate: '2026-02-30' }, bodyFor(saved).installments[1]] },
            { installments: Array.from({ length: 61 }, () => ({ amount: '1', dueDate: '2020-01-10' })) },
        ];
        for (const change of invalid) expect((await amend(saved, { ...bodyFor(saved), ...change })).status).toBe(400);
        expect(await current(saved)).toEqual(saved);
    });

    it('conserva todas las cuotas en su orden y rechaza identidades ajenas o duplicadas', async () => {
        const saved = await createAgreement(); const other = await createAgreement();
        const rows = bodyFor(saved).installments;
        for (const installments of [[], [rows[0]], [rows[1], rows[0]], [rows[0], rows[0]],
            [rows[0], { ...rows[1], id: other.installments[0].id }],
            [rows[0], rows[1], { id: rows[0].id, amount: '1', dueDate: '2020-01-10' }]]) {
            expect((await amend(saved, { ...bodyFor(saved), installments })).status).toBe(400);
        }
        expect(await current(saved)).toEqual(saved);
    });

    it('actualiza pendientes y saldos según el nuevo importe y vencimiento', async () => {
        const saved = (await pay(await createAgreement())).body;
        const body = bodyFor(saved);
        body.installments[0].amount = '90.25';
        const changed = await amend(saved, body);
        expect(changed.status).toBe(200);
        expect((await auth('get', '/api/fees/upcoming')).body.find(item => item.id === saved.installments[0].id).balanceCents).toBe(5015);
        const moved = bodyFor(changed.body); moved.installments[0].dueDate = '2099-05-01';
        expect((await amend(changed.body, moved)).status).toBe(200);
        expect((await auth('get', '/api/fees/upcoming')).body.some(item => item.id === saved.installments[0].id)).toBe(false);
    });

    it('protege estudio, titular independiente, sesión y rol y registra al administrador', async () => {
        const saved = await createAgreement(); const body = bodyFor(saved);
        const route = '/api/fees/case/' + saved.caseId + '/amendments';
        expect((await request(app).post(route).send(body)).status).toBe(401);
        expect((await amend(saved, body, 'inactive')).status).toBe(401);
        expect((await amend(saved, body, 'operator')).status).toBe(403);
        expect((await amend(saved, body, 'b')).status).toBe(404);
        const solo = await createAgreement('solo');
        expect((await amend(solo, bodyFor(solo), 'solo2')).status).toBe(404);
        expect((await amend(solo, bodyFor(solo), 'a')).status).toBe(404);
        const adminId = randomUUID();
        await prisma.user.create({ data: { id: adminId, studioId: 'a', role: 'ADMIN', name: 'Administradora de acuerdos', email: adminId + '@test.invalid', password: 'unused' } });
        tokens[adminId] = jwt.sign({ id: adminId }, process.env.JWT_SECRET);
        const result = await amend(saved, body, adminId);
        expect(result.status).toBe(200);
        expect(result.body.amendments[0]).toMatchObject({ registeredById: adminId, registeredByName: 'Administradora de acuerdos' });
        expect((await amend(solo, bodyFor(solo), 'super')).status).toBe(200);
    });

    it('usa rol y estudio actuales y excluye expedientes eliminados', async () => {
        const saved = await createAgreement(); const body = bodyFor(saved);
        try {
            await prisma.user.update({ where: { id: 'a' }, data: { role: 'OPERATOR' } });
            expect((await amend(saved, body)).status).toBe(403);
            await prisma.user.update({ where: { id: 'a' }, data: { role: 'LAWYER', studioId: 'b' } });
            expect((await amend(saved, body)).status).toBe(404);
        } finally { await prisma.user.update({ where: { id: 'a' }, data: { role: 'LAWYER', studioId: 'a' } }); }
        await prisma.case.update({ where: { id: saved.caseId }, data: { deletedAt: new Date() } });
        expect((await amend(saved, body, 'super')).status).toBe(404);
        expect(await prisma.feeAgreementAmendment.count({ where: { agreementId: saved.id } })).toBe(0);
    });

    it('dos editores simultáneos no pueden aplicar dos cambios sobre la misma versión', async () => {
        const saved = await createAgreement();
        const responses = await Promise.all([amend(saved), amend(saved, { ...bodyFor(saved), description: 'Otra edición concurrente' })]);
        expect(responses.map(item => item.status).sort()).toEqual([200, 409]);
        const result = await current(saved);
        expect(result.version).toBe(saved.version + 1);
        expect(result.amendments).toHaveLength(1);
        expect(result.description).toBe(responses.find(item => item.status === 200).body.description);
    }, 20000);

    it('un pago concurrente con una edición conserva ambos movimientos mediante reintentos explícitos', async () => {
        const saved = await createAgreement(); const body = bodyFor(saved); body.installments[0].amount = '150.00';
        const paymentBody = { amount: '20.00', paidAt: '2020-01-10', requestId: randomUUID() };
        const responses = await Promise.all([amend(saved, body), pay(saved, paymentBody)]);
        for (const response of responses) expect([200, 409]).toContain(response.status);
        expect(responses.some(response => response.status === 200)).toBe(true);
        if (responses[1].status === 409) expect((await pay(saved, paymentBody)).status).toBe(200);
        if (responses[0].status === 409) {
            const latest = await current(saved);
            const retry = { ...body, expectedVersion: latest.version };
            expect((await amend(latest, retry)).status).toBe(200);
        }
        const result = await current(saved);
        expect(result).toMatchObject({ totalCents: 20010, paidCents: 2000, balanceCents: 18010, version: 3 });
        expect(result.installments[0].payments).toHaveLength(1);
        expect(result.amendments).toHaveLength(1);
    }, 20000);

    it('revierte descripción, cuotas, versión y auditoría si falla la escritura del historial', async () => {
        const saved = await createAgreement(); const body = bodyFor(saved);
        body.installments[0].amount = '150.00'; body.installments.push({ amount: '25.00', dueDate: '2099-05-01' });
        const trigger = 'fail_amendment_' + randomUUID().replaceAll('-', '');
        await prisma.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "FeeAgreementAmendment" WHEN NEW."agreementId" = '${saved.id}' BEGIN SELECT RAISE(ABORT, 'Simulated amendment storage failure'); END`);
        try { expect((await amend(saved, body)).status).toBe(500); }
        finally { await prisma.$executeRawUnsafe(`DROP TRIGGER "${trigger}"`); }
        expect(await current(saved)).toEqual(saved);
        expect(await prisma.feeAgreementAmendment.count({ where: { agreementId: saved.id } })).toBe(0);
    });
});

describe('Comprobantes de pagos de honorarios: archivos reales e historial privado', () => {
    const paid = async (user = 'a') => {
        const id = randomUUID();
        await prisma.case.create({ data: { id, caseNumber: id, title: 'Comprobantes ficticios', createdById: user, studioId: user === 'a' ? 'a' : null } });
        const created = await auth('post', '/api/fees/case/' + id, user).send({ description: 'Acuerdo de prueba de comprobantes', installments: [{ amount: '100.25', dueDate: '2020-01-10' }] });
        expect(created.status).toBe(201);
        const paymentResponse = await auth('post', '/api/fees/installments/' + created.body.installments[0].id + '/payments', user)
            .send({ amount: '40.10', paidAt: '2020-01-10', notes: 'Pago de prueba', requestId: randomUUID() });
        expect(paymentResponse.status).toBe(200);
        return { user, agreement: paymentResponse.body, paymentId: paymentResponse.body.installments[0].payments[0].id };
    };
    const current = async state => {
        const response = await auth('get', '/api/fees/case/' + state.agreement.caseId, state.user);
        expect(response.status).toBe(200);
        return response.body;
    };
    const paymentOf = (agreement, id) => agreement.installments[0].payments.find(item => item.id === id);
    const firstReceipt = (agreement, id) => paymentOf(agreement, id).receipts[0];
    const upload = (state, fields = {}, options = {}) => {
        const body = { expectedVersion: String(state.agreement.version), requestId: randomUUID(), ...fields };
        const call = auth('post', '/api/fees/payments/' + state.paymentId + '/receipt', options.user || state.user);
        for (const [key, value] of Object.entries(body)) if (value !== undefined) call.field(key, String(value));
        return options.noFile ? call : call.attach('file', options.bytes ?? pdf, { filename: options.filename || 'recibo.pdf', contentType: options.contentType || 'application/pdf' });
    };
    const snapshot = async () => ({ files: readdirSync(storage).sort(), metadata: await prisma.caseFile.count(), receipts: await prisma.feePaymentReceipt.count() });

    it('guarda bytes privados vinculados al pago y conserva importes, fechas e historial monetario', async () => {
        const state = await paid();
        const original = await prisma.feePayment.findUnique({ where: { id: state.paymentId } });
        const result = await upload(state);
        expect(result.status).toBe(200);
        const receipt = firstReceipt(result.body, state.paymentId);
        expect(result.body).toMatchObject({ version: state.agreement.version + 1, totalCents: 10025, paidCents: 4010, balanceCents: 6015 });
        expect(receipt).toMatchObject({ paymentId: state.paymentId, sequence: 1, uploadedById: 'a', uploadedByName: 'a', fileStatus: 'AVAILABLE',
            file: { name: 'recibo.pdf', caseId: state.agreement.caseId } });
        expect(receipt.fileId).toBe(receipt.file.id);
        expect(receipt.file.url).toBe('/api/cases/files/' + receipt.file.id + '/download');
        expect(readFileSync(path.join(storage, receipt.file.id))).toEqual(pdf);
        expect(await prisma.feePayment.findUnique({ where: { id: state.paymentId } })).toEqual(original);
        expect(Number.isFinite(Date.parse(receipt.createdAt))).toBe(true);
    });

    it('descarga los mismos bytes tras reconectar con otra sesión autorizada y bloquea accesos ajenos', async () => {
        const state = await paid();
        const saved = await upload(state);
        expect(saved.status).toBe(200);
        const receipt = firstReceipt(saved.body, state.paymentId);
        await prisma.$disconnect();
        tokens.a = jwt.sign({ id: 'a' }, process.env.JWT_SECRET);
        const listed = await current(state);
        expect(firstReceipt(listed, state.paymentId)).toEqual(receipt);
        const download = await auth('get', receipt.file.url, 'operator').buffer(true).parse(binary);
        expect(download.status).toBe(200); expect(download.body).toEqual(pdf);
        expect(download.headers['cache-control']).toContain('no-store');
        expect(download.headers['x-content-type-options']).toBe('nosniff');
        expect((await auth('get', receipt.file.url, 'super')).status).toBe(200);
        expect((await auth('get', receipt.file.url, 'b')).status).toBe(404);
        expect((await auth('get', receipt.file.url, 'solo')).status).toBe(404);
        expect((await request(app).get(receipt.file.url)).status).toBe(401);
        expect((await request(app).get('/uploads/' + receipt.file.id)).status).toBe(404);
    });

    it('reemplaza agregando historial y conserva ambos archivos protegidos incluso después de anular el pago', async () => {
        const state = await paid();
        const one = await upload(state);
        expect(one.status).toBe(200);
        const first = firstReceipt(one.body, state.paymentId);
        state.agreement = one.body;
        const nextBytes = Buffer.from('%PDF-1.4\nComprobante reemplazado\n%%EOF\n');
        const two = await upload(state, { reason: 'Mejor legibilidad' }, { bytes: nextBytes, filename: 'nuevo.pdf' });
        expect(two.status).toBe(200);
        const receipts = paymentOf(two.body, state.paymentId).receipts;
        expect(receipts.map(item => item.sequence)).toEqual([2, 1]);
        expect(receipts[0]).toMatchObject({ reason: 'Mejor legibilidad', previousVersion: one.body.version });
        expect(receipts[1]).toEqual(first);
        expect(readFileSync(path.join(storage, first.file.id))).toEqual(pdf);
        expect(readFileSync(path.join(storage, receipts[0].file.id))).toEqual(nextBytes);
        const reversed = await auth('post', '/api/fees/payments/' + state.paymentId + '/reversal').send({ reason: 'Pago cargado por error', requestId: randomUUID() });
        expect(reversed.status).toBe(200);
        expect(paymentOf(reversed.body, state.paymentId).receipts).toHaveLength(2);
        for (const receipt of receipts) {
            expect((await auth('delete', '/api/cases/files/' + receipt.file.id)).status).toBe(409);
            expect((await auth('get', receipt.file.url)).status).toBe(200);
        }
        expect(await prisma.feePaymentReceipt.count({ where: { paymentId: state.paymentId } })).toBe(2);
    });

    it('un reintento idéntico no duplica archivos, auditoría ni versión y limpia los bytes nuevos', async () => {
        const state = await paid();
        const fields = { requestId: randomUUID(), expectedVersion: String(state.agreement.version), reason: 'Documento recibido' };
        const first = await upload(state, fields);
        expect(first.status).toBe(200);
        const before = await snapshot();
        const retry = await upload(state, fields);
        expect(retry.status).toBe(200);
        expect(retry.body).toEqual(first.body);
        expect(await snapshot()).toEqual(before);
    });

    it('rechaza reutilizar la solicitud con otros bytes, nombre, motivo o versión sin dejar archivos', async () => {
        const state = await paid();
        const fields = { requestId: randomUUID(), expectedVersion: String(state.agreement.version), reason: 'Documento recibido' };
        expect((await upload(state, fields)).status).toBe(200);
        const before = await snapshot();
        for (const [changed, options] of [
            [{}, { bytes: Buffer.from('%PDF-1.4\nOtro contenido\n%%EOF') }],
            [{}, { filename: 'otro-nombre.pdf' }],
            [{ reason: 'Otro motivo' }, {}],
            [{ expectedVersion: String(state.agreement.version + 1) }, {}],
        ]) {
            expect((await upload(state, { ...fields, ...changed }, options)).status).toBe(409);
            expect(await snapshot()).toEqual(before);
        }
    });

    it('rechaza versiones antiguas y requiere motivo para reemplazar un archivo', async () => {
        const state = await paid();
        const first = await upload(state);
        expect(first.status).toBe(200);
        const before = await snapshot();
        expect((await upload(state, { reason: 'Reemplazo desde una vista vieja' })).status).toBe(409);
        expect(await snapshot()).toEqual(before);
        state.agreement = first.body;
        for (const reason of [undefined, '', '  ', 'x'.repeat(2001)]) {
            expect((await upload(state, { reason })).status).toBe(400);
            expect(await snapshot()).toEqual(before);
        }
    });

    it('impide cargas sin sesión, de operadores, cuentas inactivas y otros estudios antes de guardar bytes', async () => {
        const state = await paid();
        const before = await snapshot();
        expect((await request(app).post('/api/fees/payments/' + state.paymentId + '/receipt').attach('file', pdf, 'sin-sesion.pdf')).status).toBe(401);
        for (const [user, expected] of [['operator', 403], ['inactive', 401], ['b', 404]]) {
            expect((await upload(state, {}, { user })).status).toBe(expected);
            expect(await snapshot()).toEqual(before);
        }
    });

    it('aísla titulares independientes y excluye expedientes eliminados también para el superadministrador', async () => {
        const state = await paid('solo');
        const before = await snapshot();
        for (const user of ['solo2', 'a', 'b']) expect((await upload(state, {}, { user })).status).toBe(404);
        expect(await snapshot()).toEqual(before);
        await prisma.case.update({ where: { id: state.agreement.caseId }, data: { deletedAt: new Date() } });
        expect((await upload(state, {}, { user: 'super' })).status).toBe(404);
        expect(await snapshot()).toEqual(before);
    });

    it('vuelve a comprobar la cuenta, rol y estudio después de recibir el archivo', async () => {
        const state = await paid();
        const transaction = prisma.$transaction.bind(prisma);
        for (const [change, expected] of [[{ role: 'OPERATOR' }, 403], [{ studioId: 'b' }, 404], [{ deletedAt: new Date() }, 401]]) {
            const before = await snapshot();
            const spy = vi.spyOn(prisma, '$transaction').mockImplementationOnce(async handler => {
                await prisma.user.update({ where: { id: 'a' }, data: change });
                return transaction(handler);
            });
            try { expect((await upload(state)).status).toBe(expected); }
            finally { spy.mockRestore(); await prisma.user.update({ where: { id: 'a' }, data: { role: 'LAWYER', studioId: 'a', deletedAt: null } }); }
            expect(await snapshot()).toEqual(before);
        }
    });

    it('bloquea nuevas cargas para un pago anulado y conserva la lectura del comprobante anterior', async () => {
        const state = await paid();
        const first = await upload(state);
        expect(first.status).toBe(200);
        const receipt = firstReceipt(first.body, state.paymentId);
        expect((await auth('post', '/api/fees/payments/' + state.paymentId + '/reversal').send({ reason: 'Carga incorrecta', requestId: randomUUID() })).status).toBe(200);
        const before = await snapshot();
        expect((await upload(state, { reason: 'No debe adjuntarse' })).status).toBe(409);
        expect(await snapshot()).toEqual(before);
        const listed = await current(state);
        expect(paymentOf(listed, state.paymentId).reversal).toBeTruthy();
        expect(firstReceipt(listed, state.paymentId).fileStatus).toBe('AVAILABLE');
        expect((await auth('get', receipt.file.url)).status).toBe(200);
    });

    it('informa contenido físico faltante sin borrar el historial y permite cargar un reemplazo', async () => {
        const state = await paid();
        const first = await upload(state);
        expect(first.status).toBe(200);
        const receipt = firstReceipt(first.body, state.paymentId);
        unlinkSync(path.join(storage, receipt.file.id));
        const listed = await current(state);
        expect(firstReceipt(listed, state.paymentId)).toMatchObject({ id: receipt.id, fileStatus: 'MISSING', file: { id: receipt.file.id } });
        expect((await auth('get', receipt.file.url)).status).toBe(404);
        state.agreement = listed;
        const replaced = await upload(state, { reason: 'Reposición del contenido faltante' }, { filename: 'reposicion.pdf' });
        expect(replaced.status).toBe(200);
        expect(paymentOf(replaced.body, state.paymentId).receipts.map(item => item.fileStatus)).toEqual(['AVAILABLE', 'MISSING']);
    });

    it('valida campos, identificadores, archivo obligatorio y formato sin dejar cargas parciales', async () => {
        const state = await paid();
        const before = await snapshot();
        const attempts = [
            [{ requestId: 'invalid' }, {}], [{ expectedVersion: 'abc' }, {}], [{ expectedVersion: '0' }, {}],
            [{ fileId: randomUUID() }, {}], [{ url: 'https://example.invalid/archivo.pdf' }, {}],
            [{}, { noFile: true }], [{}, { bytes: Buffer.alloc(0) }],
            [{}, { bytes: Buffer.from('no es pdf'), filename: 'falso.pdf' }],
            [{}, { filename: 'script.exe', contentType: 'application/octet-stream' }],
        ];
        for (const [fields, options] of attempts) {
            const result = await upload(state, fields, options);
            expect([400, 415]).toContain(result.status);
            expect(await snapshot()).toEqual(before);
        }
    });

    it('rechaza archivos que superan 20 MB y envíos múltiples sin registrar contenido', async () => {
        const state = await paid();
        const before = await snapshot();
        const oversized = Buffer.alloc(20 * 1024 * 1024 + 1, 'a'); pdf.copy(oversized);
        expect((await upload(state, {}, { bytes: oversized })).status).toBe(413);
        const multiple = await auth('post', '/api/fees/payments/' + state.paymentId + '/receipt')
            .field('expectedVersion', String(state.agreement.version)).field('requestId', randomUUID())
            .attach('file', pdf, 'uno.pdf').attach('file', pdf, 'dos.pdf');
        expect(multiple.status).toBe(400);
        expect(await snapshot()).toEqual(before);
    }, 30000);

    it('revierte archivo, auditoría y versión si falla el registro del comprobante', async () => {
        const state = await paid();
        const before = await snapshot();
        const original = await current(state);
        const trigger = 'fail_receipt_' + randomUUID().replaceAll('-', '');
        await prisma.$executeRawUnsafe(`CREATE TRIGGER "${trigger}" BEFORE INSERT ON "FeePaymentReceipt" WHEN NEW."paymentId" = '${state.paymentId}' BEGIN SELECT RAISE(ABORT, 'Simulated receipt storage failure'); END`);
        try { expect((await upload(state)).status).toBe(500); }
        finally { await prisma.$executeRawUnsafe(`DROP TRIGGER "${trigger}"`); }
        expect(await snapshot()).toEqual(before);
        expect(await current(state)).toEqual(original);
    });

    it('dos reemplazos simultáneos con la misma versión conservan solo un comprobante nuevo y su historia', async () => {
        const state = await paid();
        const first = await upload(state);
        expect(first.status).toBe(200);
        state.agreement = first.body;
        const before = await snapshot();
        const results = await Promise.all([
            upload(state, { reason: 'Reemplazo A' }, { filename: 'reemplazo-a.pdf' }),
            upload(state, { reason: 'Reemplazo B' }, { filename: 'reemplazo-b.pdf' }),
        ]);
        expect(results.map(item => item.status).sort()).toEqual([200, 409]);
        const after = await snapshot();
        expect(after.files).toHaveLength(before.files.length + 1);
        expect(after.metadata).toBe(before.metadata + 1); expect(after.receipts).toBe(before.receipts + 1);
        const listed = await current(state);
        expect(listed.version).toBe(first.body.version + 1);
        expect(paymentOf(listed, state.paymentId).receipts.map(item => item.sequence)).toEqual([2, 1]);
        expect(listed).toMatchObject({ paidCents: 4010, balanceCents: 6015 });
    }, 30000);
});

describe('Aislamiento de documentos generados y fuentes guardadas', () => {
    it('ofrece portales sin resultados inventados ni llamadas a IA', async () => {
        const result = await auth('post', '/api/jurisprudencia/search').send({ q: 'daños', apiKey: 'unused' });
        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({ mode: 'OFFICIAL_PORTALS', results: [] });
        expect(result.body.portals).toHaveLength(2);
        for (const q of [null, {}, ['daños'], 'ab', 'x'.repeat(501)]) {
            expect((await auth('post', '/api/jurisprudencia/search').send({ q })).status).toBe(400);
        }
    });

    it('persiste datos y procedencia sin calificarlos como fallos verificados', async () => {
        const insightData = { titulo: 'Referencia de prueba', tribunal: 'Tribunal de prueba', fecha: '2026-10-19',
            url: 'https://www.justiciacordoba.gob.ar/documento-prueba', extracto: 'Nota ingresada por el usuario.' };
        const saved = await auth('post', '/api/jurisprudencia/save').send({ caseId: 'case-a', insightData });
        expect(saved.status).toBe(201);
        expect(saved.body).toMatchObject({ ...insightData, verification: 'USER_PROVIDED', registeredBy: 'a' });
        expect(saved.body.registeredAt).toBeTruthy();
        const notices=await prisma.notification.findMany({where:{caseId:'case-a',title:'Referencia jurídica incorporada',message:{contains:insightData.titulo}}});
        expect(notices.map(n=>n.userId).sort()).toEqual(['a','operator']);
        expect(notices.every(n=>n.message.startsWith('a ·'))).toBe(true);
        expect(notices.every(n=>!n.message.includes(insightData.extracto))).toBe(true);
        await prisma.$disconnect();
        const listed = await auth('get', '/api/jurisprudencia/case/case-a');
        expect(listed.body).toContainEqual(saved.body);
        for (const [id, user] of [['case-a', 'b'], ['case-solo', 'solo2'], ['deleted', 'super']]) {
            expect((await auth('get', '/api/jurisprudencia/case/' + id, user)).status).toBe(404);
        }
        expect((await request(app).get('/api/jurisprudencia/case/case-a')).status).toBe(401);
    });

    it.each([
        'https://example.invalid/fallo', 'javascript:alert(1)', 'http://www.saij.gob.ar/fallo',
        'https://www.saij.gob.ar.example.invalid/fallo', 'https://saij.gob.ar@evil.invalid/fallo',
        'https://user:pass@www.saij.gob.ar/fallo', 'https://localhost/fallo',
        'https://www.saij.gob.ar:444/fallo', 'https://www.saij.gob.ar\\@evil.invalid/fallo',
    ])('rechaza enlaces ajenos o inseguros: %s', async url => {
        const before = await prisma.timelineEvent.count();
        const result = await auth('post', '/api/jurisprudencia/save').send({ caseId: 'case-a',
            insightData: { titulo: 'Prueba', tribunal: 'Prueba', fecha: '2026-10-19', url } });
        expect(result.status).toBe(400);
        expect(await prisma.timelineEvent.count()).toBe(before);
    });

    it('valida campos y conserva el texto histórico como no verificado', async () => {
        const insightData = { titulo: 'Prueba', tribunal: 'Prueba', fecha: '2026-10-19', url: 'https://www.saij.gob.ar/documento-prueba' };
        for (const change of [{ titulo: {} }, { tribunal: '' }, { fecha: '2026-02-30' }, { extracto: 'x'.repeat(5001) }]) {
            expect((await auth('post', '/api/jurisprudencia/save').send({ caseId: 'case-a', insightData: { ...insightData, ...change } })).status).toBe(400);
        }
        const old = await prisma.timelineEvent.create({ data: { caseId: 'case-a', title: 'Anterior', description: 'Texto previo',
            type: 'JURISPRUDENCIA', eventDate: new Date() } });
        const listed = await auth('get', '/api/jurisprudencia/case/case-a');
        expect(listed.body.find(item => item.id === old.id)).toMatchObject({ verification: 'LEGACY_UNVERIFIED', description: 'Texto previo' });
    });

    it('impide generar documentos o guardar jurisprudencia en expedientes ajenos independientes', async () => {
        const insightData = { titulo: 'Fuente de prueba', tribunal: 'Tribunal de prueba', fecha: '2026-10-19', url: 'https://www.saij.gob.ar/documento-prueba' };
        expect((await auth('post', '/api/documents/generate', 'solo2').send({ caseId: 'case-solo' })).status).toBe(404);
        expect((await auth('post', '/api/jurisprudencia/save', 'solo2').send({ caseId: 'case-solo', insightData })).status).toBe(404);
        expect((await auth('post', '/api/documents/generate', 'solo').send({ caseId: 'case-solo' })).status).toBe(200);
        expect((await auth('post', '/api/jurisprudencia/save', 'solo').send({ caseId: 'case-solo', insightData })).status).toBe(201);
    });

    it('respeta estudios y expedientes eliminados también al generar y guardar', async () => {
        const insightData = { titulo: 'Prueba', tribunal: 'Prueba', fecha: '2026-10-19', url: 'https://example.invalid/fallo' };
        for (const [caseId, user] of [['case-a', 'b'], ['deleted', 'super']]) {
            expect((await auth('post', '/api/documents/generate', user).send({ caseId })).status).toBe(404);
            expect((await auth('post', '/api/jurisprudencia/save', user).send({ caseId, insightData })).status).toBe(404);
        }
    });
});
