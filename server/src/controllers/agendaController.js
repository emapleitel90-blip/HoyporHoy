import prisma from '../utils/prismaClient.js';
import { caseScope, participantScope } from '../utils/caseAccess.js';
import { parseDeadlineDate } from '../utils/argentinaTime.js';
import { PRESCRIPTION_SOURCE } from '../utils/prescriptionDeadline.js';

const person = { id: true, name: true };
const caseSelect = { id: true, title: true, caseNumber: true, priority: true, assignedLawyer: { select: person } };
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const fail = (status, message) => Object.assign(new Error(message), { status });
const handle = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
        const conflict = ['P2034', 'P2028', 'P1008'].includes(error.code);
        if (!error.status && !conflict) console.error('[agenda]', error.code || error.message);
        res.status(error.status || (conflict ? 409 : 500)).json({ message: error.status ? error.message : conflict ? 'La actividad cambió. Actualizá y reintentá.' : 'No se pudo procesar el cronograma' });
    }
};
const actorIn = async (db, id) => {
    const actor = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!actor) throw fail(401, 'La cuenta ya no está activa');
    return actor;
};
const simpleScope = user => ({
    reviewerId: null,
    AND: [
        { OR: [{ assigneeId: user.id }, { createdById: user.id }] },
        { OR: [{ caseId: null, studioId: user.studioId || null }, { case: caseScope(user) }] },
    ],
});
const reviewedScope = user => ({ reviewerId: { not: null }, case: caseScope(user),
    OR: [{ assigneeId: user.id }, { reviewerId: user.id }, { createdById: user.id }] });
const taskScope = user => ({ OR: [simpleScope(user), reviewedScope(user)] });
const cleanText = (value, label, required, max) => {
    if (!required && (value === undefined || value === null)) return null;
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw fail(400, `Ingresá ${label} válido`);
    return value.trim() || null;
};
const taskInput = body => {
    const title = cleanText(body.title, 'un título de hasta 200 caracteres', true, 200);
    const instructions = cleanText(body.instructions, 'una descripción de hasta 10000 caracteres', false, 10000);
    const dueDate = parseDeadlineDate(body.dueDate);
    if (!dueDate) throw fail(400, 'Ingresá una fecha válida con zona horaria si incluís hora');
    const priority = body.priority || 'MEDIUM';
    if (!priorities.includes(priority)) throw fail(400, 'Seleccioná una prioridad válida');
    return { title, instructions, dueDate, priority };
};
const taskActivity = (task, user) => ({
    id: `task:${task.id}`, sourceId: task.id, source: 'TASK', kind: 'TASK', title: task.title,
    description: task.instructions, date: task.dueDate, priority: task.priority,
    status: task.status, completed: ['COMPLETED', 'APPROVED'].includes(task.status),
    case: task.case, assignee: task.assignee, updatedAt: task.updatedAt,
    reviewRequired: !!task.reviewerId,
    canEdit: !['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(task.status) && [task.assigneeId, task.createdById].includes(user.id),
    canComplete: !task.reviewerId && task.assigneeId === user.id,
});

export const getAgenda = handle(async (req, res) => {
    const start = parseDeadlineDate(req.query.start), end = parseDeadlineDate(req.query.end);
    if (!start || !end || end <= start || end - start > 62 * 86400000) throw fail(400, 'Seleccioná un rango de hasta 62 días');
    const range = { gte: start, lt: end };
    const [tasks, deadlines, cases] = await Promise.all([
        prisma.task.findMany({ where: { ...taskScope(req.user), dueDate: range }, include: { case: { select: caseSelect }, assignee: { select: person } }, orderBy: { dueDate: 'asc' } }),
        prisma.deadline.findMany({ where: { case: caseScope(req.user), dueDate: range }, include: { case: { select: caseSelect } }, orderBy: { dueDate: 'asc' } }),
        // The admission form stores the next hearing here; display it without creating a duplicate deadline.
        prisma.case.findMany({ where: caseScope(req.user), select: { ...caseSelect, details: true } }),
    ]);
    const activities = tasks.map(task => taskActivity(task, req.user));
    for (const deadline of deadlines) activities.push({
        id: `deadline:${deadline.id}`, sourceId: deadline.id, source: 'DEADLINE',
        kind: /audiencia/i.test(deadline.title) ? 'HEARING' : 'DEADLINE', title: deadline.title,
        description: deadline.notes, date: deadline.dueDate, priority: deadline.case.priority,
        editVersion: deadline.editVersion,
        completed: deadline.isCompleted, status: deadline.isCompleted ? 'COMPLETED' : 'PENDING',
        case: deadline.case, assignee: deadline.case.assignedLawyer, canEdit: deadline.source !== PRESCRIPTION_SOURCE, canComplete: true,
    });
    for (const item of cases) {
        let details;
        try { details = JSON.parse(item.details || '{}'); } catch { continue; }
        const date = parseDeadlineDate(details?.proximaAudiencia);
        if (!date || date < start || date >= end) continue;
        const { details: _, ...caseItem } = item;
        activities.push({ id: `hearing:${item.id}`, sourceId: item.id, source: 'CASE', kind: 'HEARING',
            title: 'Audiencia del expediente', description: 'Fecha registrada en Plazos y Urgencias.',
            date, priority: item.priority, status: 'SCHEDULED', completed: false,
            case: caseItem, assignee: item.assignedLawyer, canEdit: false, canComplete: false });
    }
    activities.sort((a, b) => new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id));
    res.json({ activities });
});

export const getAgendaOptions = handle(async (req, res) => {
    const cases = await prisma.case.findMany({ where: caseScope(req.user), select: { id: true, title: true, caseNumber: true, studioId: true }, orderBy: { createdAt: 'desc' } });
    const canAssign = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    let members = canAssign && req.user.studioId ? { deletedAt: null, studioId: req.user.studioId } : { deletedAt: null, id: req.user.id };
    if (req.query.caseId) {
        if (typeof req.query.caseId !== 'string') throw fail(400, 'Seleccioná un expediente válido');
        const selected = await prisma.case.findFirst({ where: { id: req.query.caseId, ...caseScope(req.user) } });
        if (!selected) throw fail(404, 'Expediente no disponible');
        members = { ...participantScope(selected), ...(!canAssign ? { id: req.user.id } : {}) };
    }
    const users = await prisma.user.findMany({ where: members, select: person });
    res.json({ cases, users, canAssign, defaultAssigneeId: users.some(user => user.id === req.user.id) ? req.user.id : null });
});

export const createAgendaTask = handle(async (req, res) => {
    const input = taskInput(req.body);
    const task = await prisma.$transaction(async tx => {
        const actor = await actorIn(tx, req.user.id);
        let caseItem = null;
        if (req.body.caseId) {
            if (typeof req.body.caseId !== 'string') throw fail(400, 'Seleccioná un expediente válido');
            caseItem = await tx.case.findFirst({ where: { id: req.body.caseId, ...caseScope(actor) } });
            if (!caseItem) throw fail(404, 'Expediente no disponible');
        }
        const assigneeId = req.body.assigneeId || actor.id;
        if (typeof assigneeId !== 'string') throw fail(400, 'Seleccioná un responsable válido');
        if (assigneeId !== actor.id && !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw fail(403, 'Solo un administrador puede asignar estas tareas a otro integrante');
        const assignee = await tx.user.findFirst({ where: { id: assigneeId,
            ...(caseItem ? participantScope(caseItem) : { deletedAt: null, studioId: actor.studioId || null, ...(!actor.studioId ? { id: actor.id } : {}) }) } });
        if (!assignee) throw fail(400, 'El responsable no está disponible en este estudio o expediente');
        return tx.task.create({ data: { ...input, caseId: caseItem?.id || null, studioId: caseItem?.studioId || actor.studioId || null,
            assigneeId, createdById: actor.id, reviewerId: null,
            events: { create: { userId: actor.id, action: 'CREATED', toStatus: 'PENDING' } } },
            include: { case: { select: caseSelect }, assignee: { select: person } } });
    });
    res.status(201).json(taskActivity(task, req.user));
});

export const updateAgendaTask = handle(async (req, res) => {
    const task = await prisma.$transaction(async tx => {
        const actor = await actorIn(tx, req.user.id);
        const current = await tx.task.findFirst({ where: { id: req.params.id, ...taskScope(actor) } });
        if (!current) throw fail(404, 'Tarea no disponible');
        if (typeof req.body.updatedAt !== 'string' || new Date(req.body.updatedAt).getTime() !== current.updatedAt.getTime()) throw fail(409, 'La tarea cambió. Actualizá antes de editar.');
        let data, action;
        if (Object.hasOwn(req.body, 'completed')) {
            if (typeof req.body.completed !== 'boolean') throw fail(400, 'Indicá un estado válido');
            if (current.reviewerId || current.assigneeId !== actor.id) throw fail(403, 'Esta tarea debe seguir su circuito de responsable y revisión');
            data = { status: req.body.completed ? 'COMPLETED' : 'PENDING' };
            action = req.body.completed ? 'COMPLETED' : 'REOPENED';
        } else {
            if (![current.assigneeId, current.createdById].includes(actor.id)) throw fail(403, 'Solo el responsable o creador puede editar la tarea');
            if (['SUBMITTED', 'APPROVED', 'COMPLETED'].includes(current.status)) throw fail(409, 'La tarea no se puede editar en este estado');
            data = taskInput(req.body);
            action = 'RESCHEDULED_OR_EDITED';
        }
        const updatedAt = new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1));
        const result = await tx.task.updateMany({ where: { id: current.id, updatedAt: current.updatedAt }, data: { ...data, updatedAt } });
        if (result.count !== 1) throw fail(409, 'La tarea cambió. Actualizá antes de reintentar.');
        await tx.taskEvent.create({ data: { taskId: current.id, userId: actor.id, action,
            fromStatus: current.status, toStatus: data.status || current.status,
            notes: action === 'RESCHEDULED_OR_EDITED' ? JSON.stringify({ before: { title: current.title, instructions: current.instructions, dueDate: current.dueDate, priority: current.priority }, after: data }) : null,
            createdAt: updatedAt } });
        return tx.task.findUnique({ where: { id: current.id }, include: { case: { select: caseSelect }, assignee: { select: person } } });
    });
    res.json(taskActivity(task, req.user));
});
