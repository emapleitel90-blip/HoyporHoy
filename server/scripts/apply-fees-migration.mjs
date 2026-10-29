// Rehearse one explicitly selected additive migration before touching the local DB.
// Run from server/: node scripts/apply-fees-migration.mjs [migration-name]
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schema = path.join(root, 'prisma/schema.prisma');
const wanted = process.argv[2] || '20261028000000_fees';
if (!['20261028000000_fees', '20261028010000_fee_payment_reversals', '20261028020000_fee_agreement_amendments', '20261028030000_fee_payment_receipts', '20261028040000_writings', '20261028050000_task_writing_versions', '20261028060000_writing_templates'].includes(wanted)) throw new Error('Unsupported migration');
if (!process.env.DATABASE_URL?.startsWith('file:')) throw new Error('This helper only supports local SQLite');
const db = new PrismaClient();
const history = await db.$queryRawUnsafe('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
const pending = readdirSync(path.join(root, 'prisma/migrations'), { withFileTypes: true }).filter(item => item.isDirectory())
    .map(item => item.name).filter(name => !history.some(row => row.migration_name === name));
if (pending.length !== 1 || pending[0] !== wanted) throw new Error('Expected only the selected migration to be pending; stopping without changes');
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const originalTables = await db.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name");
for (const table of originalTables) {
    table.columns = (await db.$queryRawUnsafe('PRAGMA table_info(' + quote(table.name) + ')')).map(column => column.name);
}
async function snapshot(client, tables) {
    const result = {};
    for (const { name, columns } of tables) {
        // Compare all previously present fields, even when an additive column is new.
        const rows = await client.$queryRawUnsafe('SELECT ' + columns.map(quote).join(', ') + ' FROM ' + quote(name) + ' ORDER BY rowid');
        result[name] = { count: rows.length, hash: createHash('sha256').update(JSON.stringify(rows, (_, value) => typeof value === 'bigint' ? value.toString() : value)).digest('hex') };
    }
    return result;
}
const before = await snapshot(db, originalTables);
const directory = path.join(root, 'scratch', 'fees-migration-' + Date.now());
mkdirSync(directory, { recursive: true });
const backup = path.join(directory, 'before.db');
const trial = path.join(directory, 'trial.db');
await db.$executeRawUnsafe("VACUUM INTO '" + backup.replaceAll("'", "''") + "'");
copyFileSync(backup, trial);
const deploy = url => execFileSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--schema', schema],
    { cwd: root, env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' });
deploy('file:' + trial.replaceAll('\\', '/'));
const rehearsal = new PrismaClient({ datasources: { db: { url: 'file:' + trial.replaceAll('\\', '/') } } });
if (JSON.stringify(await snapshot(rehearsal, originalTables)) !== JSON.stringify(before)) throw new Error('Rehearsal changed existing data');
await rehearsal.$disconnect();
if (JSON.stringify(await snapshot(db, originalTables)) !== JSON.stringify(before)) throw new Error('Local DB changed during rehearsal; stopping');
await db.$disconnect();
deploy(process.env.DATABASE_URL);
const after = new PrismaClient();
if (JSON.stringify(await snapshot(after, originalTables)) !== JSON.stringify(before)) throw new Error('Existing data does not match the backup');
console.log('[VERIFIED] Existing tables retained byte-equivalent row data:', Object.fromEntries(Object.entries(before).map(([table, value]) => [table, value.count])));
console.log('[BACKUP]', backup);
console.log('[FEES]', { agreements: await after.feeAgreement.count(), installments: await after.feeInstallment.count(), payments: await after.feePayment.count() });
if (wanted === '20261028010000_fee_payment_reversals') console.log('[REVERSALS]', await after.feePaymentReversal.count());
if (wanted === '20261028020000_fee_agreement_amendments') {
    if (await after.feeAgreement.count({ where: { version: { not: 1 } } })) throw new Error('Unexpected initial agreement version');
    console.log('[AMENDMENTS]', await after.feeAgreementAmendment.count());
}
if (wanted === '20261028030000_fee_payment_receipts') console.log('[PAYMENT RECEIPTS]', await after.feePaymentReceipt.count());
if (wanted === '20261028040000_writings') console.log('[WRITINGS]', { writings: await after.writing.count(), versions: await after.writingVersion.count() });
await after.$disconnect();
