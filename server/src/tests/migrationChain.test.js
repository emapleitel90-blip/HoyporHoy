import { describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

describe('Cadena completa de migraciones de la beta', () => {
    it('despliega en una base vacía, conserva datos al reintentar y coincide con el esquema actual', async () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'hoyporhoy-migrations-'));
        const database = path.join(directory, 'test.db');
        writeFileSync(database, '');
        const url = `file:${database.replaceAll('\\', '/')}?connection_limit=1`;
        const env = { ...process.env, DATABASE_URL: url };
        const db = new PrismaClient({ datasources: { db: { url } } });
        const migrate = (...args) => execFileSync(process.execPath,
            ['node_modules/prisma/build/index.js', 'migrate', ...args], { env, encoding: 'utf8', timeout: 60000 });
        try {
            migrate('deploy', '--schema', 'prisma/schema.prisma');
            const expected = readdirSync('prisma/migrations', { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
            const applied = await db.$queryRawUnsafe('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
            expect(applied.map(row => row.migration_name)).toEqual(expected);
            await db.user.create({ data: { id: 'owner', name: 'Titular ficticio', email: 'test@example.invalid', password: 'unused' } });
            const item = await db.case.create({ data: { caseNumber: 'MIGRATION-TEST', title: 'Expediente de prueba', createdById: 'owner' } });
            const deadline = await db.deadline.create({ data: { caseId: item.id, title: 'Plazo de prueba', dueDate: new Date('2027-01-01T03:00:00Z') } });
            migrate('deploy', '--schema', 'prisma/schema.prisma');
            expect(await db.case.findUnique({ where: { id: item.id } })).toEqual(item);
            expect(await db.deadline.findUnique({ where: { id: deadline.id } })).toEqual(deadline);
            expect(await db.$queryRawUnsafe('PRAGMA foreign_key_check')).toEqual([]);
            expect(migrate('diff', '--from-url', url, '--to-schema-datamodel', 'prisma/schema.prisma', '--script', '--exit-code')).toContain('This is an empty migration');
        } finally {
            await db.$disconnect();
            if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('hoyporhoy-migrations-')) {
                throw new Error('Unexpected migration fixture');
            }
            rmSync(directory, { recursive: true, force: true });
        }
    }, 60000);
});
