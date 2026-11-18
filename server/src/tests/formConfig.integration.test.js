import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { errorHandler } from '../middleware/errorMiddleware.js';

const directory = mkdtempSync(path.join(tmpdir(), 'lyp-form-config-'));
const database = path.join(directory, 'test.db');
const previous = { DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET };
const sections = description => [{
    id: 'documentos', title: 'Documentación', type: 'checklist', enabled: true,
    description, items: ['DNI'],
}];
const token = id => jwt.sign({ id }, process.env.JWT_SECRET);
let prisma, app;

function executeMigration(name) {
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'execute',
        '--schema', 'prisma/schema.prisma', '--file', `prisma/migrations/${name}/migration.sql`]);
}

beforeAll(async () => {
    process.env.DATABASE_URL = `file:${database.replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    prisma = (await import('../utils/prismaClient.js')).default;
    executeMigration('20260413195754_init_complete');
    for (const id of ['a', 'b', 'c']) {
        await prisma.studio.create({ data: { id, name: `Estudio ${id}`, cuit: id } });
    }
    const legacyRows = [
        ['global', 'Plantilla histórica'],
        ['c', 'Personalización del estudio C'],
    ];
    for (const [scope, description] of legacyRows) {
        await prisma.$executeRaw`INSERT INTO FormConfig (id, scope, sections, updatedAt)
            VALUES (${scope}, ${scope}, ${JSON.stringify(sections(description))}, CURRENT_TIMESTAMP)`;
    }
    executeMigration('20261112010000_scope_form_config');
    await prisma.studio.create({ data: { id: 'suspended', name: 'Estudio suspendido', cuit: 'suspended', status: 'SUSPENDED' } });
    await prisma.$executeRaw`INSERT INTO "User" (id, name, email, password, "studioId")
        VALUES ('legacy-suspended', 'Cuenta previa', 'legacy-suspended@test.invalid', 'test', 'suspended')`;
    executeMigration('20261112020000_user_session_version');

    const users = [
        ['admin-a', 'ADMIN', 'a'], ['admin-b', 'ADMIN', 'b'], ['admin-c', 'ADMIN', 'c'],
        ['operator-a', 'OPERATOR', 'a'], ['lawyer-a', 'LAWYER', 'a'],
        ['solo-a', 'LAWYER', null], ['solo-b', 'LAWYER', null],
        ['platform', 'SUPER_ADMIN', null],
    ];
    for (const [id, role, studioId] of users) {
        await prisma.user.create({ data: { id, role, studioId, name: id, email: `${id}@test.invalid`, password: 'test' } });
    }
    app = express();
    app.use(express.json());
    app.use('/api/form-config', (await import('../routes/formConfigRoutes.js')).default);
    app.use(errorHandler);
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

function call(method, id, body, suffix = '') {
    const req = request(app)[method](`/api/form-config${suffix}`).set('Authorization', `Bearer ${token(id)}`);
    return body ? req.send(body) : req;
}

describe('Configuración de admisión por ámbito', () => {
    beforeEach(async () => {
        await prisma.formConfig.deleteMany({ where: { scope: { in: ['studio:a', 'user:solo-a'] } } });
    });

    it('conserva la plantilla y las personalizaciones previas al migrar', async () => {
        const inherited = await call('get', 'admin-a');
        expect(inherited.body).toEqual({ version: 0, canEdit: true, sections: sections('Plantilla histórica') });
        expect(inherited.headers['cache-control']).toBe('private, no-store');
        expect((await call('get', 'admin-c')).body).toEqual({
            version: 1, canEdit: true, sections: sections('Personalización del estudio C'),
        });
        expect(await prisma.formConfig.count()).toBe(2);
    });

    it('impide que sesiones de estudios ya suspendidos vuelvan a funcionar al reactivarlos', async () => {
        await prisma.studio.update({ where: { id: 'suspended' }, data: { status: 'ACTIVE' } });
        expect((await call('get', 'legacy-suspended')).status).toBe(401);
    });

    it('autoriza la edición al administrador y conserva el ámbito de estudios e independientes', async () => {
        const saved = await call('put', 'admin-a', { version: 0, sections: sections('Formulario A') });
        expect(saved.status).toBe(200);
        expect(saved.body.version).toBe(1);
        expect((await call('get', 'operator-a')).body).toEqual({
            version: 1, canEdit: false, sections: sections('Formulario A'),
        });
        expect((await call('get', 'admin-b')).body.sections).toEqual(sections('Plantilla histórica'));
        expect((await call('post', 'solo-a', { version: 0, sections: sections('Formulario propio') })).status).toBe(200);
        expect((await call('get', 'solo-a')).body.sections).toEqual(sections('Formulario propio'));
        expect((await call('get', 'solo-b')).body.sections).toEqual(sections('Plantilla histórica'));
        expect((await call('get', 'platform')).body.sections).toEqual(sections('Plantilla histórica'));
    });

    it.each(['operator-a', 'lawyer-a'])('mantiene a %s en solo lectura por todas las rutas de edición', async id => {
        await call('put', 'admin-a', { version: 0, sections: sections('Formulario A') });
        const payload = { version: 1, sections: sections('Cambio de prueba') };
        expect((await call('put', id, payload)).status).toBe(403);
        expect((await call('post', id, payload)).status).toBe(403);
        expect((await call('post', id, { version: 1 }, '/reset')).status).toBe(403);
        expect((await call('get', 'admin-a')).body.sections).toEqual(sections('Formulario A'));
    });

    it('rechaza versiones obsoletas, módulos inválidos y el guardado sin versión', async () => {
        await call('put', 'admin-a', { version: 0, sections: sections('Formulario A') });
        expect((await call('put', 'admin-a', { version: 0, sections: sections('Primera edición repetida') })).status).toBe(409);
        expect((await call('put', 'admin-a', { sections: sections('Sin versión') })).status).toBe(400);
        expect((await call('put', 'admin-a', { version: 1, sections: [{ ...sections('Inválido')[0], items: {} }] })).status).toBe(400);
        expect((await call('put', 'admin-a', { version: 1, sections: [{ ...sections('Deshabilitado')[0], enabled: false }] })).status).toBe(400);
        const result = await call('put', 'admin-a', { version: 1, sections: sections('Edición vigente') });
        expect(result.body.version).toBe(2);
        expect((await call('post', 'admin-a', { version: 1 }, '/reset')).status).toBe(409);
        expect((await call('get', 'admin-a')).body.sections).toEqual(sections('Edición vigente'));
    });

    it('restablece solo el formulario del ámbito autenticado', async () => {
        await call('put', 'admin-a', { version: 0, sections: sections('Formulario A') });
        await call('post', 'solo-a', { version: 0, sections: sections('Formulario propio') });
        const reset = await call('post', 'admin-a', { version: 1 }, '/reset');
        expect(reset.status).toBe(200);
        expect(reset.body.version).toBe(2);
        expect(reset.body.sections[0].id).toBe('datos-consultante');
        expect((await call('get', 'admin-b')).body.sections).toEqual(sections('Plantilla histórica'));
        expect((await call('get', 'admin-c')).body.sections).toEqual(sections('Personalización del estudio C'));
        expect((await call('get', 'solo-a')).body.sections).toEqual(sections('Formulario propio'));
    });

    it('acepta un solo guardado cuando dos ediciones parten de la misma versión', async () => {
        const first = await call('put', 'admin-a', { version: 0, sections: sections('Formulario A') });
        const attempts = await Promise.all(['Edición uno', 'Edición dos'].map(description =>
            call('put', 'admin-a', { version: first.body.version, sections: sections(description) })
        ));
        expect(attempts.map(result => result.status).sort()).toEqual([200, 409]);
        expect((await call('get', 'admin-a')).body).toEqual(attempts.find(result => result.status === 200).body);
    });
});
