import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Migración de escritos sobre expedientes y pagos anteriores', () => {
    it('agrega versiones y sus restricciones conservando cada fila anterior', async () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'lyp-writing-migration-'));
        const url = 'file:' + path.join(directory, 'test.db').replaceAll('\\', '/');
        const db = new PrismaClient({ datasources: { db: { url } } });
        const quote = value => '"' + value.replaceAll('"', '""') + '"';
        try {
            const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
                '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: url } });
            for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
                if (/CREATE (?:TABLE "(?:Writing|WritingVersion)"|(?:UNIQUE )?INDEX "(?:Writing|WritingVersion)_)/.test(statement)) continue;
                await db.$executeRawUnsafe(statement);
            }
            // The derived baseline now includes later nullable references to WritingVersion.
            // Seed historical rows before that parent table exists, then enforce and audit every FK.
            await db.$executeRawUnsafe('PRAGMA foreign_keys=OFF');
            await db.user.create({ data: { id: 'user', name: 'Persona ficticia', email: 'writing-migration@example.invalid', password: 'unused', role: 'LAWYER' } });
            await db.case.create({ data: { id: 'case', title: 'Expediente anterior', caseNumber: 'WRITING-MIGRATION', createdById: 'user' } });
            await db.caseFile.create({ data: { id: 'file', caseId: 'case', name: 'archivo.pdf', url: '/api/cases/files/file/download' } });
            await db.task.create({ data: { id: 'task', title: 'Tarea anterior', caseId: 'case', assigneeId: 'user', reviewerId: 'user', createdById: 'user',
                status: 'APPROVED', events: { create: { userId: 'user', action: 'APPROVED', toStatus: 'APPROVED', notes: 'Historial previo sin versión vinculada' } } } });
            await db.feeAgreement.create({ data: { id: 'agreement', caseId: 'case', description: 'Acuerdo anterior', createdById: 'user', version: 7 } });
            await db.feeInstallment.create({ data: { id: 'installment', agreementId: 'agreement', position: 1, amountCents: 10025, paidCents: 4010, dueDate: new Date('2026-10-28T03:00:00Z') } });
            await db.feePayment.create({ data: { id: 'payment', installmentId: 'installment', amountCents: 4010,
                paidAt: new Date('2026-10-28T03:00:00Z'), registeredById: 'user', requestId: 'original' } });
            const tables = (await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).map(row => row.name);
            const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table,
                await db.$queryRawUnsafe('SELECT * FROM ' + quote(table) + ' ORDER BY rowid')])));
            const before = await snapshot();
            const migration = readFileSync('prisma/migrations/20261028040000_writings/migration.sql', 'utf8');
            for (const statement of migration.replace(/^--.*$/gm, '').split(';').map(value => value.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
            await db.$executeRawUnsafe('PRAGMA foreign_keys=ON');
            expect(await db.$queryRawUnsafe('PRAGMA foreign_key_check')).toEqual([]);
            expect(await snapshot()).toEqual(before);
            expect(await db.writing.count()).toBe(0);
            expect(await db.writingVersion.count()).toBe(0);
            const writing = { id: 'writing', caseId: 'case', requestId: 'request', createdById: 'user', createdByName: 'Persona ficticia' };
            await db.writing.create({ data: writing });
            const version = { writingId: 'writing', number: 1, previousVersion: 0, requestId: 'version-request', title: 'Título', content: 'Texto original',
                notes: '', createdById: 'user', createdByName: 'Persona ficticia' };
            await db.writingVersion.create({ data: version });
            await expect(db.writing.create({ data: { ...writing, id: 'duplicate' } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.writingVersion.create({ data: { ...version, requestId: 'other' } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.writingVersion.create({ data: { ...version, number: 2 } })).rejects.toMatchObject({ code: 'P2002' });
            await expect(db.writingVersion.create({ data: { ...version, writingId: 'missing' } })).rejects.toMatchObject({ code: 'P2003' });
            expect(await snapshot()).toEqual(before);
            const difference = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-url', url,
                '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: url } });
            expect(difference).toContain('This is an empty migration');
        } finally {
            await db.$disconnect();
            if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('lyp-writing-migration-')) throw new Error('Unexpected directory');
            rmSync(directory, { recursive: true, force: true });
        }
    }, 60000);
});
