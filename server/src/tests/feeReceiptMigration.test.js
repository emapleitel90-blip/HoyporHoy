import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Migración de comprobantes sobre pagos y archivos anteriores', () => {
    it('agrega historial de archivos sin cambiar pagos, saldos ni versiones y conserva sus referencias', async () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'lyp-receipt-migration-'));
        const url = 'file:' + path.join(directory, 'test.db').replaceAll('\\', '/');
        const db = new PrismaClient({ datasources: { db: { url } } });
        try {
            const migration = '20261028030000_fee_payment_receipts';
            const baselineSql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
                '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: url } });
            for (const statement of baselineSql.split(';').map(value => value.trim()).filter(Boolean)) {
                if (/CREATE (?:TABLE "FeePaymentReceipt"|(?:UNIQUE )?INDEX "FeePaymentReceipt_)/.test(statement)) continue;
                await db.$executeRawUnsafe(statement);
            }
            await db.user.create({ data: { id: 'u', name: 'Usuario ficticio', email: 'receipt-migration@example.invalid', password: 'unused', role: 'LAWYER' } });
            await db.case.create({ data: { id: 'c', title: 'Prueba', caseNumber: 'RECEIPT-MIGRATION', createdById: 'u' } });
            await db.feeAgreement.create({ data: { id: 'a', caseId: 'c', description: 'Acuerdo previo', createdById: 'u', version: 7 } });
            await db.feeInstallment.create({ data: { id: 'i', agreementId: 'a', position: 1, amountCents: 10025, paidCents: 4010, dueDate: new Date('2026-10-28T03:00:00Z') } });
            await db.feePayment.create({ data: { id: 'p', installmentId: 'i', amountCents: 4010, paidAt: new Date('2026-10-28T03:00:00Z'), registeredById: 'u', requestId: 'original' } });
            await db.caseFile.create({ data: { id: 'f', caseId: 'c', name: 'previo.pdf', url: '/api/cases/files/f/download' } });
            const agreementBefore = await db.feeAgreement.findUnique({ where: { id: 'a' } });
            const installmentBefore = await db.feeInstallment.findUnique({ where: { id: 'i' } });
            const paymentBefore = await db.feePayment.findUnique({ where: { id: 'p' } });
            const fileBefore = await db.caseFile.findUnique({ where: { id: 'f' } });
            const sql = readFileSync(path.join('prisma/migrations', migration, 'migration.sql'), 'utf8');
            for (const statement of sql.replace(/^--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
            expect(await db.feeAgreement.findUnique({ where: { id: 'a' } })).toEqual(agreementBefore);
            expect(await db.feeInstallment.findUnique({ where: { id: 'i' } })).toEqual(installmentBefore);
            expect(await db.feePayment.findUnique({ where: { id: 'p' }, include: { receipts: true } })).toEqual({ ...paymentBefore, receipts: [] });
            expect(await db.caseFile.findUnique({ where: { id: 'f' } })).toEqual(fileBefore);
            const receipt = { paymentId: 'p', fileId: 'f', sequence: 1, requestId: 'first', reason: 'Archivo anterior',
                previousVersion: 7, contentHash: 'a'.repeat(64), uploadedById: 'u', uploadedByName: 'Usuario ficticio' };
            await db.feePaymentReceipt.create({ data: receipt });
            await db.caseFile.create({ data: { id: 'f2', caseId: 'c', name: 'otro.pdf', url: '/api/cases/files/f2/download' } });
            await expect(db.feePaymentReceipt.create({ data: { ...receipt, requestId: 'other', sequence: 2 } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.feePaymentReceipt.create({ data: { ...receipt, fileId: 'f2', requestId: 'other' } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.feePaymentReceipt.create({ data: { ...receipt, fileId: 'f2', sequence: 2 } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.caseFile.delete({ where: { id: 'f' } })).rejects.toMatchObject({ code: 'P2003' });
            await expect(db.feePayment.delete({ where: { id: 'p' } })).rejects.toMatchObject({ code: 'P2003' });
            expect(await db.feePayment.findUnique({ where: { id: 'p' } })).toEqual(paymentBefore);
        } finally {
            await db.$disconnect();
            if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-receipt-migration-')) throw new Error('Unexpected directory');
            rmSync(directory, { recursive: true, force: true });
        }
    }, 60000);
});
