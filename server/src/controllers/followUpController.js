import { stat } from 'node:fs/promises';
import prisma from '../utils/prismaClient.js';
import { caseScope, participantScope, REVIEWER_ROLES } from '../utils/caseAccess.js';
import { isPrivateCaseFile, caseFilePath } from '../utils/caseFileStorage.js';
import { AppError } from '../middleware/errorMiddleware.js';

const person = { id: true, name: true, role: true };
const include = {
    owner: { select: person }, createdBy: { select: person },
    file: { select: { id: true, name: true, url: true } },
    case: { select: { id: true, title: true, caseNumber: true } },
    events: { include: { user: { select: person } }, orderBy: { createdAt: 'asc' } },
};
const canReview = user => REVIEWER_ROLES.includes(user.role);
const handle = fn => async (req, res, next) => {
    try { await fn(req, res); }
    catch (error) {
        if (['P2021', 'P2022'].includes(error.code)) return next(new AppError('El seguimiento todavía no está habilitado en esta instalación', 503));
        next(error);
    }
};
const text = (value, label, required = false, max = 10000) => {
    if (value == null && !required) return null;
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new AppError(`${label}: ingresá un texto válido`, 400);
    return value.trim() || null;
};
const date = (value, required) => {
    if ((value == null || value === '') && !required) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(new Date(value).getTime())) throw new AppError('Ingresá una fecha acordada válida', 400);
    return new Date(value);
};
const getCase = async (tx, id, user) => {
    const item = await tx.case.findFirst({ where: { id, ...caseScope(user) } });
    if (!item) throw new AppError('Expediente no disponible', 404);
    return item;
};
const checkOwner = async (tx, id, caseItem) => {
    if (typeof id !== 'string' || !id) throw new AppError('Seleccioná un responsable', 400);
    const owner = await tx.user.findFirst({ where: { AND: [participantScope(caseItem), { id }] } });
    if (!owner) throw new AppError('El responsable debe estar activo y pertenecer al expediente', 400);
};

export const getCaseFollowUps = handle(async (req, res) => {
    await getCase(prisma, req.params.caseId, req.user);
    res.json(await prisma.followUp.findMany({ where: { caseId: req.params.caseId }, include, orderBy: { createdAt: 'desc' } }));
});
export const getMyFollowUps = handle(async (req, res) => {
    res.json(await prisma.followUp.findMany({ where: {
        ownerId: req.user.id, status: { notIn: ['VERIFIED', 'COMPLETED'] }, case: caseScope(req.user),
    }, include, orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }] }));
});
export const getFollowUpsToReview = handle(async (req, res) => {
    if (!canReview(req.user)) return res.json([]);
    res.json(await prisma.followUp.findMany({ where: {
        kind: 'DOCUMENT', status: 'RECEIVED', case: caseScope(req.user),
    }, include, orderBy: { updatedAt: 'asc' } }));
});
export const createFollowUp = handle(async (req, res) => {
    const { kind, ownerId } = req.body;
    if (!['DOCUMENT', 'COMMITMENT', 'BLOCKER'].includes(kind)) throw new AppError('Tipo de seguimiento inválido', 400);
    const title = text(req.body.title, 'Descripción', true, 200);
    const notes = text(req.body.notes, 'Detalle');
    const dueDate = date(req.body.dueDate, kind !== 'BLOCKER');
    const item = await prisma.$transaction(async tx => {
        const caseItem = await getCase(tx, req.params.caseId, req.user);
        await checkOwner(tx, ownerId, caseItem);
        return tx.followUp.create({ data: {
            kind, title, notes, dueDate, ownerId, caseId: caseItem.id, createdById: req.user.id,
            events: { create: { userId: req.user.id, action: 'CREATED', toStatus: 'PENDING' } },
        }, include });
    });
    res.status(201).json(item);
});

const mutate = operation => handle(async (req, res) => {
    const item = await prisma.$transaction(async tx => {
        const current = await tx.followUp.findFirst({ where: { id: req.params.id, case: caseScope(req.user) }, include: { case: true } });
        if (!current) throw new AppError('Seguimiento no disponible', 404);
        if (req.user.id !== current.ownerId && !canReview(req.user)) throw new AppError('Solo el responsable o un abogado o administrador puede actualizar este seguimiento', 403);
        if (typeof req.body.version !== 'string') throw new AppError('Falta la versión del seguimiento', 400);
        if (req.body.version !== current.updatedAt.toISOString()) throw new AppError('El seguimiento cambió. Actualizá e intentá de nuevo', 409);
        let data, action, notes = null, changes = null;
        if (operation === 'edit') {
            if (['VERIFIED', 'COMPLETED'].includes(current.status)) throw new AppError('Reabrí el seguimiento antes de editarlo', 409);
            const ownerId = req.body.ownerId;
            await checkOwner(tx, ownerId, current.case);
            data = { title: text(req.body.title, 'Descripción', true, 200), notes: text(req.body.notes, 'Detalle'),
                ownerId, dueDate: date(req.body.dueDate, current.kind !== 'BLOCKER') };
            action = 'UPDATED';
            changes = JSON.stringify({ before: { title: current.title, notes: current.notes, ownerId: current.ownerId, dueDate: current.dueDate }, after: data });
        } else {
            action = req.body.action;
            const rules = {
                RECEIVE: { kind: ['DOCUMENT'], from: ['PENDING', 'REVISION_REQUESTED'], to: 'RECEIVED' },
                VERIFY: { kind: ['DOCUMENT'], from: ['RECEIVED'], to: 'VERIFIED', review: true },
                REQUEST_REVISION: { kind: ['DOCUMENT'], from: ['RECEIVED'], to: 'REVISION_REQUESTED', review: true, notes: true },
                COMPLETE: { kind: ['COMMITMENT', 'BLOCKER'], from: ['PENDING'], to: 'COMPLETED', notes: true },
                REOPEN: { kind: ['DOCUMENT', 'COMMITMENT', 'BLOCKER'], from: ['RECEIVED', 'REVISION_REQUESTED', 'VERIFIED', 'COMPLETED'], to: 'PENDING', notes: true },
            };
            const rule = Object.hasOwn(rules, action) ? rules[action] : null;
            if (!rule) throw new AppError('Acción inválida', 400);
            if ((rule.review || current.status === 'VERIFIED') && !canReview(req.user)) throw new AppError('La verificación y las correcciones requieren un abogado o administrador', 403);
            if (!rule.kind.includes(current.kind) || !rule.from.includes(current.status)) throw new AppError('La acción no corresponde al estado actual', 409);
            notes = text(req.body.notes, 'Observaciones', rule.notes);
            data = { status: rule.to };
            if (action === 'RECEIVE') {
                if (typeof req.body.fileId !== 'string') throw new AppError('Seleccioná un archivo del expediente', 400);
                const file = await tx.caseFile.findFirst({ where: { id: req.body.fileId, caseId: current.caseId } });
                if (!file || !isPrivateCaseFile(file)) throw new AppError('Seleccioná un archivo privado cargado en este expediente', 400);
                try { if (!(await stat(caseFilePath(file.id))).isFile()) throw new Error('missing'); }
                catch { throw new AppError('El contenido del archivo no está disponible', 400); }
                data.fileId = file.id;
            }
            if (action === 'REOPEN') data.fileId = null;
        }
        data.updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
        const result = await tx.followUp.updateMany({ where: { id: current.id, updatedAt: current.updatedAt }, data });
        if (result.count !== 1) throw new AppError('El seguimiento cambió. Actualizá e intentá de nuevo', 409);
        await tx.followUpEvent.create({ data: {
            followUpId: current.id, userId: req.user.id, action, notes, changes,
            fileId: Object.hasOwn(data, 'fileId') ? data.fileId : current.fileId,
            fromStatus: current.status, toStatus: data.status || current.status,
        } });
        return tx.followUp.findUnique({ where: { id: current.id }, include });
    });
    res.json(item);
});
export const updateFollowUp = mutate('edit');
export const actOnFollowUp = mutate('action');
