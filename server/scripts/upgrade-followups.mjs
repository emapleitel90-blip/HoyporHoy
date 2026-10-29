// Default: validate an isolated copy. --apply also upgrades the local workspace DB.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = fileURLToPath(new URL('../', import.meta.url));
const workspace = path.dirname(serverRoot.replace(/[\\/]$/, ''));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('file:') || databaseUrl.includes('?')) throw new Error('Se requiere una base SQLite local sin parámetros de URL');
const databasePath = path.resolve(serverRoot, 'prisma', databaseUrl.slice(5));
if (!databasePath.toLowerCase().startsWith((workspace + path.sep).toLowerCase())) throw new Error('La base debe pertenecer a este espacio de trabajo');
const apply = process.argv.includes('--apply');
const snapshotRoot = path.join(serverRoot, 'prisma', 'backups');
await mkdir(snapshotRoot, { recursive: true });
const backupPath = path.join(snapshotRoot, `before-followups-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}.db`);
const trialRoot = await mkdtemp(path.join(tmpdir(), 'lyp-followup-upgrade-'));
const trialPath = path.join(trialRoot, 'trial.db');
const main = new PrismaClient({ datasources: { db: { url: `file:${databasePath.replaceAll('\\', '/')}` } } });
let trial;
const tables = ['Studio', 'User', 'Case', 'CaseFile', 'Deadline', 'TimelineEvent', 'Client', 'Expense', 'Notification', 'FormConfig', 'Task', 'TaskEvent'];
const fingerprint = async client => {
    const hash = createHash('sha256');
    for (const table of tables) {
        const rows = await client.$queryRawUnsafe(`SELECT * FROM "${table}" ORDER BY "id"`);
        hash.update(table).update(JSON.stringify(rows, (_key, value) => typeof value === 'bigint' ? value.toString() : value));
    }
    return hash.digest('hex');
};
const run = (args, url) => execFileSync(process.execPath, [path.join(serverRoot, 'node_modules/prisma/build/index.js'), ...args], {
    cwd: serverRoot, env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});
try {
    // VACUUM INTO takes a consistent SQLite snapshot; no application rows are logged.
    await main.$executeRawUnsafe('VACUUM INTO ?', backupPath);
    console.log(`Respaldo conservado: ${backupPath}`);
    await copyFile(backupPath, trialPath);
    const trialUrl = `file:${trialPath.replaceAll('\\', '/')}`;
    trial = new PrismaClient({ datasources: { db: { url: trialUrl } } });
    const before = await fingerprint(trial);
    run(['migrate', 'deploy'], trialUrl);
    const diff = run(['migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], trialUrl);
    if (!diff.includes('This is an empty migration')) throw new Error(`El esquema de la copia no coincide con el esquema esperado:\n${diff}`);
    if (await fingerprint(trial) !== before) throw new Error('Los datos existentes cambiaron en el ensayo');
    console.log('Ensayo aprobado: esquema coincidente y datos existentes conservados.');
    if (apply) {
        if (await fingerprint(main) !== before) throw new Error('La base cambió durante el ensayo. Volvé a comprobarla antes de actualizar');
        run(['migrate', 'deploy'], databaseUrl);
        if (await fingerprint(main) !== before) throw new Error('Revisar datos tras la migración; se conserva el respaldo y no se restaura automáticamente');
        console.log('Nueva migración aplicada a la base local. Datos anteriores conservados.');
    } else console.log('Modo de comprobación: la base habitual no se modificó. Usá --apply para activar después del ensayo.');
} finally {
    await trial?.$disconnect(); await main.$disconnect();
    if (path.dirname(path.resolve(trialRoot)) === path.resolve(tmpdir()) && path.basename(trialRoot).startsWith('lyp-followup-upgrade-')) await rm(trialRoot, { recursive: true, force: true });
}
