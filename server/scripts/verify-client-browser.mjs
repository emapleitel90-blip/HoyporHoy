// Isolated, loopback-only fixture for manual browser verification.
// Run from the repository root: node server/scripts/verify-client-browser.mjs --faults
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = mkdtempSync(path.join(tmpdir(), 'lyp-browser-'));
const build = path.join(directory, 'client');
const port = 4317;
const origin = `http://127.0.0.1:${port}`;
const faults = process.argv.includes('--faults');
process.env.DATABASE_URL = `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}`;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.CASE_FILES_DIR = path.join(directory, 'files');
mkdirSync(process.env.CASE_FILES_DIR);
const prisma = (await import('../src/utils/prismaClient.js')).default;
const schema = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
    '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'],
{ cwd: path.join(root, 'server'), encoding: 'utf8' });
for (const sql of schema.split(';').map(value => value.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql);
await prisma.user.create({ data: { id: 'browser-lawyer', name: 'Abogada de prueba',
    email: 'navegador@example.invalid', password: await bcrypt.hash('PruebaNavegador2026!', 10), role: 'LAWYER' } });
await prisma.case.create({ data: { id: 'browser-case', title: 'Expediente ficticio de navegación',
    caseNumber: 'PRUEBA-NAVEGADOR', clientName: 'Cliente ficticio', fuero: 'Civil', createdById: 'browser-lawyer' } });
if (process.argv.includes('--full-flow')) {
    await prisma.studio.create({data:{id:'browser-studio',name:'Estudio ficticio de prueba',cuit:'FICTICIO-PRUEBA'}});
    await prisma.user.update({where:{id:'browser-lawyer'},data:{studioId:'browser-studio'}});
    await prisma.user.create({data:{id:'browser-operator',name:'Operador de prueba',email:'operador.navegador@example.invalid',
        password:await bcrypt.hash('PruebaNavegador2026!',10),role:'OPERATOR',studioId:'browser-studio'}});
    await prisma.case.update({where:{id:'browser-case'},data:{studioId:'browser-studio',assignedLawyerId:'browser-lawyer'}});
}
const amendments = process.argv.includes('--amendments');
const paymentReceipts = process.argv.includes('--payment-receipts');
const partialPayment = amendments || paymentReceipts;
if (process.argv.includes('--reversals') || partialPayment) {
    await prisma.feeAgreement.create({ data: { id: 'browser-agreement', caseId: 'browser-case',
        description: paymentReceipts ? 'Acuerdo ficticio con comprobantes' : amendments ? 'Acuerdo ficticio original' : 'Acuerdo ficticio para rectificación', createdById: 'browser-lawyer',
        installments: { create: { id: 'browser-quota', position: 1, amountCents: 10025, paidCents: partialPayment ? 4010 : 10025,
            dueDate: new Date('2020-01-10T03:00:00Z'), payments: { create: { id: 'browser-payment', amountCents: partialPayment ? 4010 : 10025,
                paidAt: new Date('2020-01-10T03:00:00Z'), registeredById: 'browser-lawyer', requestId: randomUUID(),
                notes: paymentReceipts ? 'Pago ficticio para adjuntar comprobantes' : amendments ? 'Pago ficticio anterior al cambio de acuerdo' : 'Pago ficticio a rectificar' } } } },
    } });
}
const XLSX = await import('../../client/node_modules/xlsx/xlsx.mjs');
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Título', 'Cliente', 'Descripción', 'Fuero', 'Estado'],
    ['Importación ficticia de Excel', 'María Ficticia', 'Dato exclusivo de prueba', 'Laboral', 'OPEN'],
]), 'Casos');
const fixture = path.join(directory, 'casos-ficticios.xlsx');
writeFileSync(fixture, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
const receiptFixture = path.join(directory, 'comprobante-pago.png');
const receiptReplacement = path.join(directory, 'comprobante-pago-reemplazo.png');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWX0AAAAASUVORK5CYII=', 'base64');
writeFileSync(receiptFixture, png);
writeFileSync(receiptReplacement, png);

execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--outDir', build, '--manifest'],
    { cwd: path.join(root, 'client'), env: { ...process.env, NODE_ENV: 'production', VITE_API_URL: origin }, stdio: 'inherit' });
const app = express();
app.use(express.json());
app.use((req, res, next) => {
    const requestPath = req.path;
    res.on('finish', () => {
        console.log(`[HTTP] ${req.method} ${requestPath} ${res.statusCode}`);
    });
    next();
});
for (const [prefix, filename] of [
    ['auth', 'auth'], ['cases', 'case'], ['studios', 'studio'], ['deadlines', 'deadline'],
    ['expenses', 'expense'], ['jurisprudencia', 'jurisprudence'], ['notifications', 'notification'],
    ['form-config', 'formConfig'], ['tasks', 'task'], ['follow-ups', 'followUp'], ['fees', 'fee'], ['writings', 'writing'],
]) {
    app.use('/api/' + prefix, (await import('../src/routes/' + filename + 'Routes.js')).default);
}
app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no incluida en esta verificación' }));
app.use((await import('../src/middleware/errorMiddleware.js')).errorHandler);
let failedHelp = false;
app.use((req, res, next) => {
    if (!faults || !req.path.endsWith('.js')) return next();
    if (!failedHelp && /^\/assets\/Help-/.test(req.path)) {
        failedHelp = true;
        console.log('[FAULT] Simulated Help download failure (once)');
        return res.status(503).type('text/plain').send('Simulated download failure');
    }
    setTimeout(next, 800);
});
app.use(express.static(build));
app.get('*', (req, res) => res.sendFile(path.join(build, 'index.html')));
const server = app.listen(port, '127.0.0.1', () => {
    console.log(`[READY] ${origin} · isolated fixture · faults=${faults}`);
    console.log(`[FIXTURE] ${fixture}`);
    if (paymentReceipts) console.log('[RECEIPT FIXTURES]', receiptFixture, receiptReplacement);
    console.log(`[DATABASE] ${directory}`);
    console.log('[LOGIN] navegador@example.invalid / PruebaNavegador2026! (fictitious account)');
});
let stopping = false;
async function stop() {
    if (stopping) return;
    stopping = true;
    console.log('[DATABASE CHECK]', JSON.stringify({ cases: await prisma.case.count(),
        imported: await prisma.case.count({ where: { title: 'Importación ficticia de Excel' } }),
        agreements: await prisma.feeAgreement.count(), payments: await prisma.feePayment.count(),
        reversals: await prisma.feePaymentReversal.count(),
        amendments: await prisma.feeAgreementAmendment.count(),
        receipts: await prisma.feePaymentReceipt.count(),
        writings: await prisma.writing.count(), versions: await prisma.writingVersion.count(),
        paidCents: (await prisma.feeInstallment.aggregate({ _sum: { paidCents: true } }))._sum.paidCents }));
    server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
