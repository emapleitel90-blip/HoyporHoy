import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Migración de modificaciones sobre acuerdos y pagos anteriores', () => {
    it('agrega versión inicial e historial sin reescribir datos monetarios existentes', async () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'lyp-amendment-migration-'));
        const url = 'file:' + path.join(directory, 'test.db').replaceAll('\\', '/');
        const db = new PrismaClient({ datasources: { db: { url } } });
        try {
            const migration = '20261028020000_fee_agreement_amendments';
            const baselineSql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
                '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: url } });
            for (let statement of baselineSql.split(';').map(value => value.trim()).filter(Boolean)) {
                if (/CREATE (?:TABLE "FeeAgreementAmendment"|UNIQUE INDEX "FeeAgreementAmendment_)/.test(statement)) continue;
                if (/CREATE TABLE "FeeAgreement"/.test(statement)) statement = statement.replace(/^\s*"version" INTEGER NOT NULL DEFAULT 1,\r?\n/m, '');
                await db.$executeRawUnsafe(statement);
            }
            await db.user.create({ data: { id: 'u', name: 'Usuario ficticio', email: 'amendment-migration@example.invalid', password: 'unused', role: 'LAWYER' } });
            await db.case.create({ data: { id: 'c', title: 'Prueba', caseNumber: 'AMENDMENT-MIGRATION', createdById: 'u' } });
            await db.$executeRawUnsafe('INSERT INTO "FeeAgreement" ("id", "caseId", "description", "createdById") VALUES (?, ?, ?, ?)', 'a', 'c', 'Acuerdo previo', 'u');
            await db.feeInstallment.create({ data: { id: 'i', agreementId: 'a', position: 1, amountCents: 10025, paidCents: 4010, dueDate: new Date('2026-10-28T03:00:00Z') } });
            await db.feePayment.create({ data: { id: 'p', installmentId: 'i', amountCents: 4010, paidAt: new Date('2026-10-28T03:00:00Z'), registeredById: 'u', requestId: 'original' } });
            const agreementBefore = await db.feeAgreement.findUnique({ where: { id: 'a' }, select: {
                id: true, caseId: true, description: true, currency: true, createdById: true, createdAt: true,
            } });
            const installmentBefore = await db.feeInstallment.findUnique({ where: { id: 'i' } });
            const paymentBefore = await db.feePayment.findUnique({ where: { id: 'p' } });
            const sql = readFileSync(path.join('prisma/migrations', migration, 'migration.sql'), 'utf8');
            for (const statement of sql.replace(/^--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
            expect(await db.feeAgreement.findUnique({ where: { id: 'a' } })).toEqual({ ...agreementBefore, version: 1 });
            expect(await db.feeInstallment.findUnique({ where: { id: 'i' } })).toEqual(installmentBefore);
            expect(await db.feePayment.findUnique({ where: { id: 'p' } })).toEqual(paymentBefore);
            expect(await db.feeAgreementAmendment.count()).toBe(0);
            const change = { agreementId: 'a', requestId: 'first', requestData: '{}', reason: 'Cambio documentado',
                previousVersion: 1, version: 2, registeredById: 'u', registeredByName: 'Usuario ficticio',
                beforeData: JSON.stringify({ description: 'Acuerdo previo' }), afterData: JSON.stringify({ description: 'Acuerdo modificado' }) };
            await db.feeAgreementAmendment.create({ data: change });
            await expect(db.feeAgreementAmendment.create({ data: { ...change, version: 3 } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.feeAgreementAmendment.create({ data: { ...change, requestId: 'other' } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.feeAgreement.delete({ where: { id: 'a' } })).rejects.toMatchObject({ code: 'P2003' });
            expect(await db.feePayment.findUnique({ where: { id: 'p' } })).toEqual(paymentBefore);
        } finally {
            await db.$disconnect();
            if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-amendment-migration-')) throw new Error('Unexpected directory');
            rmSync(directory, { recursive: true, force: true });
        }
    }, 60000);
});
