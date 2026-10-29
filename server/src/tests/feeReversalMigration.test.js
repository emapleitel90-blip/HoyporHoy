import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Migración aditiva de anulación sobre pagos anteriores', () => {
    it('conserva los registros monetarios previos y permite añadir la auditoría sin reescribir el pago', async () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'lyp-reversal-migration-'));
        const url = 'file:' + path.join(directory, 'test.db').replaceAll('\\', '/');
        const db = new PrismaClient({ datasources: { db: { url } } });
        try {
            const newMigration = '20261028010000_fee_payment_reversals';
            // The preceding schema differs only by the new table and its index.
            const baselineSql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
                '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: url } });
            for (const statement of baselineSql.split(';').map(value => value.trim()).filter(Boolean)) {
                if (/CREATE (?:TABLE "FeePaymentReversal"|UNIQUE INDEX "FeePaymentReversal_)/.test(statement)) continue;
                await db.$executeRawUnsafe(statement);
            }
            await db.user.create({ data: { id: 'u', name: 'Usuario ficticio', email: 'migration@example.invalid', password: 'unused', role: 'LAWYER' } });
            await db.case.create({ data: { id: 'c', title: 'Prueba', caseNumber: 'MIGRATION', createdById: 'u' } });
            await db.feeAgreement.create({ data: { id: 'a', caseId: 'c', description: 'Acuerdo previo', createdById: 'u' } });
            await db.feeInstallment.create({ data: { id: 'i', agreementId: 'a', position: 1, amountCents: 10025, paidCents: 4010, dueDate: new Date('2026-10-28T03:00:00Z') } });
            await db.feePayment.create({ data: { id: 'p', installmentId: 'i', amountCents: 4010, paidAt: new Date('2026-10-28T03:00:00Z'), registeredById: 'u', requestId: 'original' } });
            const original = await db.feePayment.findUnique({ where: { id: 'p' } });
            const quota = await db.feeInstallment.findUnique({ where: { id: 'i' } });
            const agreement = await db.feeAgreement.findUnique({ where: { id: 'a' } });
            const sql = readFileSync(path.join('prisma/migrations', newMigration, 'migration.sql'), 'utf8');
            for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
            expect(await db.feePayment.findUnique({ where: { id: 'p' }, include: { reversal: true } })).toEqual({ ...original, reversal: null });
            expect(await db.feeInstallment.findUnique({ where: { id: 'i' } })).toEqual(quota);
            expect(await db.feeAgreement.findUnique({ where: { id: 'a' } })).toEqual(agreement);
            await db.feePaymentReversal.create({ data: { paymentId: 'p', requestId: 'reversal', reason: 'Carga duplicada', registeredById: 'u', registeredByName: 'Usuario ficticio' } });
            expect(await db.feePayment.findUnique({ where: { id: 'p' } })).toEqual(original);
            expect(await db.feePaymentReversal.count()).toBe(1);
            await expect(db.feePaymentReversal.create({ data: { paymentId: 'p', requestId: 'other', reason: 'Segunda', registeredById: 'u', registeredByName: 'Usuario ficticio' } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.feePayment.delete({ where: { id: 'p' } })).rejects.toMatchObject({ code: 'P2003' });
        } finally {
            await db.$disconnect();
            if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-reversal-migration-')) throw new Error('Unexpected directory');
            rmSync(directory, { recursive: true, force: true });
        }
    }, 60000);
});
