import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runFileOptimizer } from '../skills/fileOptimizer.js';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

let directory;
beforeEach(() => { directory = mkdtempSync(path.join(tmpdir(), 'hoyporhoy-optimizer-')); });
afterEach(() => {
    if (path.dirname(path.resolve(directory)) !== path.resolve(tmpdir()) || !path.basename(directory).startsWith('hoyporhoy-optimizer-')) {
        throw new Error('Unexpected optimizer fixture');
    }
    rmSync(directory, { recursive: true, force: true });
});

describe('Optimizador sobre archivos temporales', () => {
    it('rechaza una limpieza de prueba sin directorio explícito antes de tocar archivos', async () => {
        await expect(runFileOptimizer()).rejects.toThrow('directorio temporal explícito');
    });
    it('elimina temporales, conserva archivos de trabajo y escribe el reporte dentro de la prueba', async () => {
        for (const folder of ['tmp', 'documents', 'node_modules', '.git', '.husky']) mkdirSync(path.join(directory, folder));
        const removed = ['npm-debug.log', 'tmp/disposable.txt', 'documents/trace.log'];
        const preserved = ['documents/case.pdf', 'server.log', 'node_modules/trace.log', '.git/trace.log', '.husky/trace.log', '.env', '.env.example'];
        for (const file of [...removed, ...preserved]) writeFileSync(path.join(directory, file), 'fixture content');

        const report = await runFileOptimizer({ projectRoot: directory });

        expect(report.archivosBorrados.sort()).toEqual(['npm-debug.log', 'tmp', 'documents/trace.log'].map(file => path.join(directory, file)).sort());
        for (const file of removed) expect(existsSync(path.join(directory, file))).toBe(false);
        for (const file of preserved) expect(readFileSync(path.join(directory, file), 'utf8')).toBe('fixture content');
        expect(report.incongruenciasDetectadas).toEqual([]);
        expect(Number.isFinite(Date.parse(report.timestamp))).toBe(true);
        expect(JSON.parse(readFileSync(path.join(directory, 'cleanup_report.json'), 'utf8'))).toEqual(report);
    });

    it('informa el archivo de ambiente adicional y conserva su contenido', async () => {
        const extra = path.join(directory, '.env.tester.incongruente');
        writeFileSync(extra, 'TEST=1');
        const report = await runFileOptimizer({ projectRoot: directory });
        expect(report.incongruenciasDetectadas).toEqual([expect.stringContaining(extra)]);
        expect(report.archivosBorrados).toEqual([]);
        expect(readFileSync(extra, 'utf8')).toBe('TEST=1');
    });
});
