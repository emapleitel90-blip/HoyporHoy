import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const server = fileURLToPath(new URL('../', import.meta.url));
const cache = path.join(server, 'node_modules', '.cache');
mkdirSync(cache, { recursive: true });
const directory = mkdtempSync(path.join(cache, 'hoyporhoy-tests-'));
const schemaPath = path.join(directory, 'schema.prisma');
const clientPath = path.join(directory, 'client');
const schema = readFileSync(path.join(server, 'prisma', 'schema.prisma'), 'utf8');
writeFileSync(schemaPath, schema.replace(/generator client \{[\s\S]*?\}/, block =>
    block.replace(/\n\}/, `\n  output = ${JSON.stringify(clientPath.replaceAll('\\', '/'))}\n}`)));

const env = {
    ...process.env,
    DATABASE_URL: `file:${path.join(directory, 'test.db').replaceAll('\\', '/')}?connection_limit=1`,
    JWT_SECRET: randomBytes(48).toString('hex'),
    HOYPORHOY_TEST_CLIENT: path.join(clientPath, 'index.js'),
};
const run = args => {
    const result = spawnSync(process.execPath, args, { cwd: server, env, stdio: 'inherit' });
    if (result.error) throw result.error;
    return result.status ?? 1;
};

let code = 1;
try {
    code = run(['node_modules/prisma/build/index.js', 'generate', '--schema', schemaPath]);
    if (code === 0) code = run(['node_modules/vitest/vitest.mjs', 'run', ...process.argv.slice(2)]);
} finally {
    if (path.dirname(path.resolve(directory)) !== path.resolve(cache) || !path.basename(directory).startsWith('hoyporhoy-tests-')) {
        throw new Error('Unexpected test runtime directory');
    }
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exitCode = code;
