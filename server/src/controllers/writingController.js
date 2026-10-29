import prisma from '../utils/prismaClient.js';
import { caseScope } from '../utils/caseAccess.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { writingWord } from '../utils/writingWord.js';

const metadata = { id: true, writingId: true, number: true, requestId: true, previousVersion: true,
    title: true, notes: true, createdById: true, createdByName: true, createdAt: true };
const editableRoles = ['OPERATOR', 'LAWYER', 'ADMIN', 'SUPER_ADMIN'];
const invalidXml = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\uD800-\uDFFF\uFFFE\uFFFF]/u;
export const checkText = (value, max, label, required = true) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || invalidXml.test(value)) {
        throw new AppError(`${label}: texto ${required ? 'requerido, ' : ''}válido de hasta ${max} caracteres`, 400);
    }
    return value;
};
const payload = (body, updating) => {
    const keys = ['title', 'content', 'notes', 'requestId', ...(updating ? ['expectedVersion'] : [])];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !keys.includes(key))) throw new AppError('Datos del escrito inválidos', 400);
    const title = checkText(body.title, 200, 'Título').trim();
    if (/[\r\n\t]/.test(title)) throw new AppError('El título debe ocupar una sola línea', 400);
    const content = checkText(body.content, 20000, 'Contenido').replace(/\r\n?/g, '\n');
    const notes = checkText(body.notes ?? '', 2000, 'Motivo', updating).trim();
    if (typeof body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) throw new AppError('Identificador de solicitud inválido', 400);
    if (updating && (!Number.isInteger(body.expectedVersion) || body.expectedVersion < 1 || body.expectedVersion >= 2147483647)) throw new AppError('Versión de origen inválida', 400);
    return { title, content, notes, requestId: body.requestId, previousVersion: updating ? body.expectedVersion : 0 };
};
const currentUser = async (db, id) => {
    const user = await db.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true, studioId: true, role: true } });
    if (!user) throw new AppError('La cuenta ya no está activa', 401);
    if (!editableRoles.includes(user.role)) throw new AppError('Tu cuenta no puede guardar escritos', 403);
    return user;
};
const checkCase = async (db, user, id) => {
    if (!await db.case.findFirst({ where: { id, ...caseScope(user) }, select: { id: true } })) throw new AppError('Expediente no disponible', 404);
};
const findWriting = async (db, user, id) => {
    const writing = await db.writing.findFirst({ where: { id, case: caseScope(user) } });
    if (!writing) throw new AppError('Escrito no disponible', 404);
    return writing;
};
const detail = async (db, writing, number = writing.currentVersion) => {
    const [versions, selectedVersion] = await Promise.all([
        db.writingVersion.findMany({ where: { writingId: writing.id }, orderBy: { number: 'desc' }, select: metadata }),
        db.writingVersion.findUnique({ where: { writingId_number: { writingId: writing.id, number } } }),
    ]);
    if (!selectedVersion) throw new AppError('Versión no disponible', 404);
    return { ...writing, versions, selectedVersion };
};
const samePayload = (version, data) => ['title', 'content', 'notes', 'previousVersion'].every(key => version[key] === data[key]);
const numberParam = value => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 2147483647) throw new AppError('Número de versión inválido', 400);
    return Number(value);
};
const handle = fn => async (req, res, next) => {
    try { await fn(req, res); }
    catch (error) {
        if (['P2021', 'P2022'].includes(error.code)) return next(new AppError('Escritos requiere aplicar su migración de base de datos', 503));
        if (['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code)) return next(new AppError('El escrito cambió. Actualizá antes de volver a guardar.', 409));
        next(error);
    }
};
export const listWritings = handle(async (req, res) => {
    await checkCase(prisma, req.user, req.params.caseId);
    const writings = await prisma.writing.findMany({ where: { caseId: req.params.caseId, case: caseScope(req.user) },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], include: { versions: { orderBy: { number: 'desc' }, take: 1, select: metadata } } });
    res.json(writings.map(({ versions, ...writing }) => ({ ...writing, latestVersion: versions[0] })));
});
export const getWriting = handle(async (req, res) => {
    const number = req.params.number === undefined ? undefined : numberParam(req.params.number);
    res.json(await prisma.$transaction(async tx => detail(tx, await findWriting(tx, req.user, req.params.id), number)));
});
export const createWriting = handle(async (req, res) => {
    const data = payload(req.body, false);
    const result = await prisma.$transaction(async tx => {
        const user = await currentUser(tx, req.user.id);
        await checkCase(tx, user, req.params.caseId);
        const prior = await tx.writing.findUnique({ where: { caseId_requestId: { caseId: req.params.caseId, requestId: data.requestId } },
            include: { versions: { where: { number: 1 } } } });
        if (prior) {
            if (!prior.versions[0] || !samePayload(prior.versions[0], data)) throw new AppError('Ese identificador corresponde a otro escrito', 409);
            const { versions: _versions, ...writing } = prior;
            return { created: false, data: await detail(tx, writing, 1) };
        }
        const author = { createdById: user.id, createdByName: user.name };
        const writing = await tx.writing.create({ data: { caseId: req.params.caseId, requestId: data.requestId, ...author,
            versions: { create: { ...data, number: 1, ...author } } } });
        return { created: true, data: await detail(tx, writing) };
    });
    res.status(result.created ? 201 : 200).json(result.data);
});
export const createWritingVersion = handle(async (req, res) => {
    const data = payload(req.body, true);
    const result = await prisma.$transaction(async tx => {
        const user = await currentUser(tx, req.user.id);
        const writing = await findWriting(tx, user, req.params.id);
        const prior = await tx.writingVersion.findUnique({ where: { writingId_requestId: { writingId: writing.id, requestId: data.requestId } } });
        if (prior) {
            if (!samePayload(prior, data)) throw new AppError('Ese identificador corresponde a otra versión', 409);
            return { created: false, data: await detail(tx, writing, prior.number) };
        }
        if (data.previousVersion !== writing.currentVersion) throw new AppError('El escrito tiene una versión nueva. Actualizá antes de guardar.', 409);
        const latest = await tx.writingVersion.findUnique({ where: { writingId_number: { writingId: writing.id, number: writing.currentVersion } } });
        if (latest.title === data.title && latest.content === data.content) throw new AppError('Modificá el título o el contenido para crear una versión nueva', 400);
        const changed = await tx.writing.updateMany({ where: { id: writing.id, currentVersion: data.previousVersion }, data: { currentVersion: { increment: 1 } } });
        if (changed.count !== 1) throw new AppError('El escrito cambió. Actualizá antes de guardar.', 409);
        await tx.writingVersion.create({ data: { ...data, writingId: writing.id, number: writing.currentVersion + 1,
            createdById: user.id, createdByName: user.name } });
        return { created: true, data: await detail(tx, { ...writing, currentVersion: writing.currentVersion + 1 }) };
    });
    res.status(result.created ? 201 : 200).json(result.data);
});
export const exportWritingVersion = handle(async (req, res) => {
    const number = numberParam(req.params.number);
    const version = await prisma.writingVersion.findFirst({ where: { writingId: req.params.id, number, writing: { case: caseScope(req.user) } } });
    if (!version) throw new AppError('Versión no disponible', 404);
    const buffer = await writingWord(version);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="escrito_${version.id}_v${number}.docx"` });
    res.send(buffer);
});
