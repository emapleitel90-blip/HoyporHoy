import prisma from '../utils/prismaClient.js';
import { caseScope, participantScope } from '../utils/caseAccess.js';
import { parseDeadlineDate } from '../utils/argentinaTime.js';
import { recordCaseActivity } from '../utils/recordCaseActivity.js';

export const nextActionSelect = { id: true, title: true, dueDate: true, status: true, updatedAt: true,
    assigneeId: true, createdById: true, reviewerId: true, caseId: true,
    assignee: { select: { id: true, name: true, deletedAt: true } } };
const fail = (status, message) => Object.assign(new Error(message), { status });
const admin = actor => ['ADMIN', 'SUPER_ADMIN'].includes(actor.role);
const editable = (action, actor) => !action || admin(actor) || [action.assigneeId, action.createdById].includes(actor.id);

export function readNextActionInput(input) {
    if (typeof input?.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) throw fail(400, 'Ingresá una próxima acción de hasta 200 caracteres');
    const dueDate = parseDeadlineDate(input.dueDate);
    if (!dueDate) throw fail(400, 'Seleccioná una fecha válida para la próxima acción');
    if (typeof input.assigneeId !== 'string' || !input.assigneeId) throw fail(400, 'Seleccioná un responsable');
    return { title: input.title.trim(), dueDate, assigneeId: input.assigneeId };
}

export async function createNextActionTask(tx, item, actor, data) {
    if (data.assigneeId !== actor.id && !admin(actor)) throw fail(403, 'Solo un administrador puede reasignar la próxima acción');
    const assignee = await tx.user.findFirst({ where: { AND: [participantScope(item), { id: data.assigneeId }] } });
    if (!assignee) throw fail(400, 'El responsable debe estar activo y pertenecer al expediente');
    return tx.task.create({
        data: {
            ...data, caseId: item.id, studioId: item.studioId, createdById: actor.id,
            reviewerId: null, events: { create: { userId: actor.id, action: 'CREATED', toStatus: 'PENDING' } },
        },
        select: nextActionSelect,
    });
}

const handle = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
        const conflict = ['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code);
        if (!error.status && !conflict) console.error('[case-workflow]', error.code || error.message);
        res.status(error.status || (conflict ? 409 : 500)).json({ message: error.status ? error.message : conflict ? 'El expediente cambió. Actualizá antes de reintentar.' : 'No se pudo procesar el expediente' });
    }
};

export const getNextAction = handle(async (req, res) => {
    const item = await prisma.case.findFirst({ where: { id: req.params.id, ...caseScope(req.user) }, include: { nextAction: { select: nextActionSelect } } });
    if (!item) throw fail(404, 'Expediente no disponible');
    const users = await prisma.user.findMany({ where: { AND: [participantScope(item),
        ...(admin(req.user) ? [] : [{ id: { in: [req.user.id, item.nextAction?.assigneeId].filter(Boolean) } }])] }, select: { id: true, name: true } });
    res.json({ nextAction: item.nextAction, users, canAssign: admin(req.user), canEdit: editable(item.nextAction, req.user),
        canComplete: item.nextAction?.assigneeId === req.user.id,
        defaultAssigneeId: users.some(user => user.id === req.user.id) ? req.user.id : '' });
});

export const setNextAction = handle(async (req, res) => {
    const data = readNextActionInput(req.body);
    const result = await prisma.$transaction(async tx => {
        const actor = await tx.user.findFirst({ where: { id: req.user.id, deletedAt: null } });
        if (!actor) throw fail(401, 'La cuenta ya no está activa');
        const item = await tx.case.findFirst({ where: { id: req.params.id, ...caseScope(actor) }, include: { nextAction: true } });
        if (!item) throw fail(404, 'Expediente no disponible');
        const current = item.nextAction;
        if (!Object.hasOwn(req.body, 'expectedTaskId') || req.body.expectedTaskId !== item.nextActionId ||
            (current && (typeof req.body.expectedUpdatedAt !== 'string' || new Date(req.body.expectedUpdatedAt).getTime() !== current.updatedAt.getTime()))) throw fail(409, 'La próxima acción cambió. Actualizá antes de guardar.');
        if (!editable(current, actor)) throw fail(403, 'Solo el responsable, creador o administrador puede cambiar esta acción');
        if (current && (current.caseId !== item.id || current.reviewerId)) throw fail(409, 'La acción vinculada no corresponde a este circuito');
        const createNew = !current || current.status === 'COMPLETED';
        if (!createNew && current.status !== 'PENDING') throw fail(409, 'La acción no permite cambios en este estado');
        let action;
        if (createNew) {
            action = await createNextActionTask(tx, item, actor, data);
        } else {
            if (data.assigneeId !== actor.id && !admin(actor) && data.assigneeId !== current.assigneeId) throw fail(403, 'Solo un administrador puede reasignar la próxima acción');
            const assignee = await tx.user.findFirst({ where: { AND: [participantScope(item), { id: data.assigneeId }] } });
            if (!assignee) throw fail(400, 'El responsable debe estar activo y pertenecer al expediente');
            const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
            const changed = await tx.task.updateMany({ where: { id: current.id, updatedAt: current.updatedAt }, data: { ...data, updatedAt } });
            if (changed.count !== 1) throw fail(409, 'La tarea cambió. Actualizá antes de guardar.');
            await tx.taskEvent.create({ data: { taskId: current.id, userId: actor.id, action: 'NEXT_ACTION_UPDATED', fromStatus: current.status, toStatus: current.status,
                notes: `Acción anterior: ${current.title}\nFecha anterior: ${current.dueDate?.toISOString() || 'Sin fecha'}\nResponsable anterior: ${current.assigneeId}`, createdAt: updatedAt } });
            action = await tx.task.findUnique({ where: { id: current.id }, select: nextActionSelect });
        }
        const changed = await tx.case.updateMany({ where: { id: item.id, nextActionId: item.nextActionId }, data: { nextActionId: action.id } });
        if (changed.count !== 1) throw fail(409, 'El expediente cambió. Actualizá antes de guardar.');
        await recordCaseActivity(tx, actor.id, item.id, 'Próxima acción actualizada', action.title);
        return action;
    });
    res.json({ nextAction: result });
});

const normalized = value => typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)) ? String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
const readDetails = value => { try { const parsed = JSON.parse(value || '{}'); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { return {}; } };

export const checkCaseDuplicates = handle(async (req, res) => {
    const fields = ['dni', 'clientName', 'nroExpediente', 'contraparte', 'excludeCaseId'];
    for (const field of fields) if (req.query[field] !== undefined && (typeof req.query[field] !== 'string' || req.query[field].length > 200)) throw fail(400, 'Los datos de búsqueda deben ser texto de hasta 200 caracteres');
    let target = null;
    if (req.query.excludeCaseId) {
        target = await prisma.case.findFirst({ where: { id: req.query.excludeCaseId, ...caseScope(req.user) }, select: { id: true, studioId: true, createdById: true } });
        if (!target) throw fail(404, 'Expediente no disponible');
    }
    const studioId = target ? target.studioId : req.user.studioId || null;
    const owner = target?.createdById || req.user.id;
    const input = Object.fromEntries(fields.map(field => [field, normalized(req.query[field])]));
    if (input.dni.length < 6 && input.clientName.length < 4 && input.nroExpediente.length < 4 && input.contraparte.length < 4) return res.json({ matches: [], total: 0 });
    const rows = await prisma.case.findMany({ where: { ...caseScope(req.user), studioId,
        ...(!studioId ? { createdById: owner } : {}), ...(target ? { id: { not: target.id } } : {}) },
        select: { id: true, caseNumber: true, clientName: true, title: true, details: true } });
    const matches = [];
    for (const row of rows) {
        const details = readDetails(row.details), reasons = [];
        const same = (key, value, minimum) => input[key].length >= minimum && input[key] === normalized(value);
        if (same('dni', details.dni || details.documentId, 6)) reasons.push('Coincide el DNI/CUIT');
        if (same('nroExpediente', details.nroExpediente || details.numeroExpediente, 4) || same('nroExpediente', row.caseNumber, 4)) reasons.push('Coincide el número de expediente');
        if (same('clientName', row.clientName, 4)) reasons.push('Coincide el nombre del consultante');
        if (same('contraparte', details.contraparte, 4)) reasons.push('Coincide la contraparte');
        if (same('contraparte', row.clientName, 4)) reasons.push('La contraparte figura como consultante en otro caso');
        if (same('clientName', details.contraparte, 4)) reasons.push('El consultante figura como contraparte en otro caso');
        if (reasons.length) matches.push({ id: row.id, caseNumber: row.caseNumber, clientName: row.clientName, title: row.title, reasons });
    }
    matches.sort((a, b) => b.reasons.length - a.reasons.length || a.caseNumber.localeCompare(b.caseNumber));
    res.json({ matches: matches.slice(0, 20), total: matches.length });
});
