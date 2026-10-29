import prisma from '../utils/prismaClient.js';
import { caseScope, participantScope, REVIEWER_ROLES } from '../utils/caseAccess.js';

const person = { id: true, name: true, role: true };
const taskInclude = {
    assignee: { select: person },
    reviewer: { select: person },
    createdBy: { select: person },
    case: { select: { id: true, title: true, caseNumber: true } },
    events: { include: { user: { select: person }, writingVersion: { select: { id: true, writingId: true, number: true, title: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
};
const fail = (status, message) => Object.assign(new Error(message), { status });
// Authorization must use the current account inside the same transaction as the change.
const activeActor = async (db, id) => {
    const actor = await db.user.findFirst({ where: { id, deletedAt: null },
        select: { id: true, role: true, studioId: true } });
    if (!actor) throw fail(401, 'La cuenta ya no está activa');
    return actor;
};
const handle = (handler) => async (req, res) => {
    try {
        await handler(req, res);
    } catch (error) {
        if (['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code)) return res.status(409).json({ message: 'La tarea cambió. Actualizá antes de reintentar.' });
        if (!error.status) console.error('[tasks]', error.code || 'Unexpected error');
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Error al procesar la tarea' });
    }
};
const text = (value, label, required = false, max = 10000) => {
    if (value == null && !required) return null;
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
        throw fail(400, `${label}: ingresá un texto válido${required ? ' (obligatorio)' : ''}`);
    }
    return value.trim() || null;
};

export const getCaseTasks = handle(async (req, res) => {
    const caseItem = await prisma.case.findFirst({ where: { id: req.params.caseId, ...caseScope(req.user) } });
    if (!caseItem) throw fail(404, 'Expediente no disponible');
    res.json(await prisma.task.findMany({
        where: { caseId: caseItem.id }, include: taskInclude, orderBy: { createdAt: 'desc' },
    }));
});

export const getTask = handle(async (req, res) => {
    const task = await prisma.task.findFirst({
        where: { id: req.params.id, case: caseScope(req.user) }, include: taskInclude,
    });
    if (!task) throw fail(404, 'Tarea no disponible');
    res.json(task);
});

export const getMyTasks = handle(async (req, res) => {
    res.json(await prisma.task.findMany({
        where: { assigneeId: req.user.id, status: { not: 'APPROVED' }, case: caseScope(req.user) },
        include: taskInclude, orderBy: { createdAt: 'desc' },
    }));
});

export const getReviewTasks = handle(async (req, res) => {
    res.json(await prisma.task.findMany({
        where: { reviewerId: req.user.id, status: 'SUBMITTED', case: caseScope(req.user) },
        include: taskInclude, orderBy: { updatedAt: 'asc' },
    }));
});

export const createTask = handle(async (req, res) => {
    const title = text(req.body.title, 'Título', true, 200);
    const instructions = text(req.body.instructions, 'Instrucciones');
    const { assigneeId, reviewerId, dueDate } = req.body;
    if (req.body.requiresWriting !== undefined && typeof req.body.requiresWriting !== 'boolean') throw fail(400, 'Indicá si la tarea requiere un escrito');
    if (typeof assigneeId !== 'string' || !assigneeId || typeof reviewerId !== 'string' || !reviewerId) {
        throw fail(400, 'Seleccioná responsable y revisor');
    }
    const date = dueDate ? new Date(dueDate) : null;
    if (dueDate != null && dueDate !== '' && (typeof dueDate !== 'string' || !Number.isFinite(date?.getTime()))) {
        throw fail(400, 'Fecha de vencimiento inválida');
    }
    const task = await prisma.$transaction(async (tx) => {
        const actor = await activeActor(tx, req.user.id);
        const caseItem = await tx.case.findFirst({ where: { id: req.params.caseId, ...caseScope(actor) } });
        if (!caseItem) throw fail(404, 'Expediente no disponible');
        const members = await tx.user.findMany({
            where: { AND: [participantScope(caseItem), { id: { in: [assigneeId, reviewerId] } }] },
            select: person,
        });
        const assignee = members.find(member => member.id === assigneeId);
        const reviewer = members.find(member => member.id === reviewerId);
        if (!assignee || !reviewer || !REVIEWER_ROLES.includes(reviewer.role)) {
            throw fail(400, 'Responsable y revisor deben estar activos y pertenecer al expediente; el revisor debe ser abogado o administrador');
        }
        if (caseItem.studioId && assigneeId === reviewerId) {
            throw fail(400, 'El revisor debe ser distinto del responsable');
        }
        return tx.task.create({
            data: {
                title, instructions, dueDate: date, caseId: caseItem.id, requiresWriting: req.body.requiresWriting === true,
                assigneeId, reviewerId, createdById: req.user.id,
                events: { create: { userId: req.user.id, action: 'CREATED', toStatus: 'PENDING' } },
            }, include: taskInclude,
        });
    });
    res.status(201).json(task);
});

const transitions = {
    start: { from: ['PENDING', 'REVISION_REQUESTED'], to: 'IN_PROGRESS', action: 'STARTED' },
    progress: { from: ['IN_PROGRESS'], to: 'IN_PROGRESS', action: 'PROGRESS_RECORDED', notes: true },
    submit: { from: ['IN_PROGRESS'], to: 'SUBMITTED', action: 'SUBMITTED', notes: true },
};

export const transitionTask = (operation) => handle(async (req, res) => {
    let transition = transitions[operation];
    if (operation === 'review') {
        if (!['APPROVED', 'REVISION_REQUESTED'].includes(req.body.decision)) {
            throw fail(400, 'Seleccioná aprobar o solicitar correcciones');
        }
        transition = {
            from: ['SUBMITTED'], to: req.body.decision, action: req.body.decision,
            notes: req.body.decision === 'REVISION_REQUESTED',
        };
    }
    const notes = text(req.body.notes, 'Observaciones', transition.notes);
    const task = await prisma.$transaction(async (tx) => {
        const actor = await activeActor(tx, req.user.id);
        const current = await tx.task.findFirst({
            where: { id: req.params.id, case: caseScope(actor) },
        });
        if (!current) throw fail(404, 'Tarea no disponible');
        const actorId = operation === 'review' ? current.reviewerId : current.assigneeId;
        if (actor.id !== actorId || (operation === 'review' && !REVIEWER_ROLES.includes(actor.role))) {
            throw fail(403, operation === 'review' ? 'Solo el revisor asignado puede revisar la tarea' : 'Solo el responsable asignado puede avanzar la tarea');
        }
        const events = await tx.taskEvent.findMany({ where: { taskId: current.id }, orderBy: { createdAt: 'desc' } });
        const submission = events.find(event => event.action === 'SUBMITTED');
        let writingVersionId = null, reviewedSubmissionId = null;
        const linked = operation === 'submit' ? current.requiresWriting || !!req.body.writingVersionId : operation === 'review' && !!submission?.writingVersionId;
        if (linked) {
            if (typeof req.body.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.body.requestId)) throw fail(400, 'Identificador de solicitud inválido');
            const prior = events.find(event => event.requestId === req.body.requestId);
            if (prior) {
                if (prior.action !== transition.action || prior.notes !== notes ||
                    (operation === 'submit' ? prior.writingVersionId !== req.body.writingVersionId : prior.reviewedSubmissionId !== req.body.submissionId)) throw fail(409, 'La solicitud corresponde a otra acción');
                return tx.task.findUnique({ where: { id: current.id }, include: taskInclude });
            }
            if (operation === 'submit') {
                if (typeof req.body.writingVersionId !== 'string') throw fail(400, 'Seleccioná una versión guardada del escrito');
                const version = await tx.writingVersion.findFirst({ where: { id: req.body.writingVersionId, writing: { caseId: current.caseId } } });
                if (!version) throw fail(404, 'Versión del escrito no disponible en este expediente');
                writingVersionId = version.id;
            } else {
                if (req.body.submissionId !== submission.id) throw fail(409, 'La entrega cambió. Actualizá antes de revisar.');
                writingVersionId = submission.writingVersionId;
                reviewedSubmissionId = submission.id;
            }
        }
        if (!transition.from.includes(current.status)) throw fail(409, 'La tarea no permite esta acción en su estado actual');
        // Compare status and version so simultaneous actions cannot overwrite each other.
        const changedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
        const updated = await tx.task.updateMany({
            where: { id: current.id, status: current.status, updatedAt: current.updatedAt },
            data: { status: transition.to, ...(linked && operation === 'submit' ? { requiresWriting: true } : {}), updatedAt: changedAt },
        });
        if (updated.count !== 1) throw fail(409, 'La tarea cambió. Actualizá e intentá de nuevo');
        await tx.taskEvent.create({
            data: { taskId: current.id, userId: req.user.id, action: transition.action, notes,
                fromStatus: current.status, toStatus: transition.to, writingVersionId, reviewedSubmissionId,
                requestId: linked ? req.body.requestId : null, createdAt: changedAt },
        });
        return tx.task.findUnique({ where: { id: current.id }, include: taskInclude });
    });
    res.json(task);
});
