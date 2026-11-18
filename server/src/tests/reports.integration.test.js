import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-reports-'));
const database = path.join(directory, 'reports.db');
const previous = { DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET };
let prisma, app;

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${database.replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    const sql = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff',
        '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) {
        await prisma.$executeRawUnsafe(statement);
    }
    await prisma.studio.createMany({ data: [
        { id: 'a', name: 'Estudio A', cuit: 'a' },
        { id: 'b', name: 'Estudio B', cuit: 'b' },
    ] });
    const users = [
        { id: 'lawyer-a', role: 'LAWYER', studioId: 'a' },
        { id: 'lawyer-b', role: 'LAWYER', studioId: 'b' },
        { id: 'admin-a', role: 'ADMIN', studioId: 'a' },
        { id: 'operator-a', role: 'OPERATOR', studioId: 'a' },
        { id: 'deleted-a', role: 'LAWYER', studioId: 'a', deletedAt: new Date() },
        { id: 'solo-a', role: 'LAWYER' },
        { id: 'solo-b', role: 'LAWYER' },
        { id: 'solo-operator', role: 'OPERATOR' },
        { id: 'platform', role: 'SUPER_ADMIN' },
    ];
    await prisma.user.createMany({ data: users.map(user => ({
        name: user.id, email: `${user.id}@test.invalid`, password: 'fixture', ...user,
    })) });
    const cases = [
        { caseNumber: 'open-a', studioId: 'a', createdById: 'admin-a', assignedLawyerId: 'lawyer-a' },
        { caseNumber: 'open-b', studioId: 'b', createdById: 'lawyer-b', assignedLawyerId: 'lawyer-b' },
        { caseNumber: 'closed-a', studioId: 'a', createdById: 'admin-a', assignedLawyerId: 'lawyer-a', status: 'CLOSED' },
        { caseNumber: 'deleted-case', studioId: 'a', createdById: 'admin-a', assignedLawyerId: 'lawyer-a', deletedAt: new Date() },
        { caseNumber: 'old-assignment', studioId: 'b', createdById: 'lawyer-b', assignedLawyerId: 'lawyer-a' },
        { caseNumber: 'solo-a', createdById: 'solo-a', assignedLawyerId: 'solo-a' },
        { caseNumber: 'solo-b', createdById: 'solo-b', assignedLawyerId: 'solo-b' },
        { caseNumber: 'old-solo-assignment', createdById: 'solo-b', assignedLawyerId: 'solo-a' },
    ];
    await prisma.case.createMany({ data: cases.map(item => ({ title: item.caseNumber, ...item })) });

    app = express();
    app.use('/api/reports', (await import('../routes/reportRoutes.js')).default);
}, 30000);

afterAll(async () => {
    await prisma?.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
        try { unlinkSync(database + suffix); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    rmdirSync(directory);
});

function report(endpoint, id) {
    const req = request(app).get(`/api/reports/${endpoint}`);
    return id ? req.set('Authorization', `Bearer ${jwt.sign({ id }, process.env.JWT_SECRET)}`) : req;
}

const workload = (id, assignedCases) => ({ id, name: id, _count: { assignedCases } });

describe('Alcance de los reportes', () => {
    it.each(['admin-a', 'operator-a', 'lawyer-a'])('muestra a %s solo abogados activos y expedientes abiertos de su estudio', async id => {
        const result = await report('caseload', id);
        expect(result.status).toBe(200);
        expect(result.headers['cache-control']).toBe('private, no-store');
        expect(result.body).toEqual([workload('lawyer-a', 1)]);
        expect((await report('caseload', 'lawyer-b')).body).toEqual([workload('lawyer-b', 1)]);
    });

    it('limita el reporte de un independiente a su cuenta y sus expedientes', async () => {
        expect((await report('caseload', 'solo-a')).body).toEqual([workload('solo-a', 1)]);
        expect((await report('caseload', 'solo-b')).body).toEqual([workload('solo-b', 1)]);
        expect((await report('caseload', 'solo-operator')).body).toEqual([]);
    });

    it('conserva la vista global del administrador de plataforma sin registros eliminados', async () => {
        const result = await report('caseload', 'platform');
        expect(result.status).toBe(200);
        expect(result.body.sort((a, b) => a.id.localeCompare(b.id))).toEqual([
            workload('lawyer-a', 2), workload('lawyer-b', 1), workload('solo-a', 2), workload('solo-b', 1),
        ]);
    });

    it('rechaza sesiones ausentes y usuarios eliminados', async () => {
        expect((await report('caseload')).status).toBe(401);
        expect((await report('caseload', 'deleted-a')).status).toBe(401);
    });

    it('usa el mismo alcance para el resumen de expedientes', async () => {
        const studio = await report('stats', 'admin-a');
        expect(studio.status).toBe(200);
        expect(studio.body).toMatchObject({ total: 2, open: 1 });
        expect(studio.body.recent.map(item => item.caseNumber).sort()).toEqual(['closed-a', 'open-a']);
        const independent = await report('stats', 'solo-a');
        expect(independent.status).toBe(200);
        expect(independent.body).toMatchObject({ total: 1, open: 1, recent: [{ caseNumber: 'solo-a' }] });
    });
});
