// Controller: Deadlines
import prisma from '../utils/prismaClient.js';
import { checkDeadlinesForUser } from '../skills/deadlineAgent.js';
import { caseScope, REVIEWER_ROLES } from '../utils/caseAccess.js';
import { argentinaDayBounds, parseDeadlineDate } from '../utils/argentinaTime.js';
import { recordCaseActivity } from '../utils/recordCaseActivity.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { PRESCRIPTION_SOURCE } from '../utils/prescriptionDeadline.js';

const prescriptionTitle = 'Prescripción';
const prescriptionConflict = 'La fecha o el vencimiento cambió. Actualizá la ficha y volvé a revisar la fecha.';
const deadlineConflict = 'El vencimiento cambió desde que lo abriste. Revisá la versión guardada antes de volver a modificarlo.';
const validVersion = version => Number.isInteger(version) && version >= 0 && version < 2147483647;
const writeConflict = error => ['P2028', 'P2034', 'P1008'].includes(error.code);
const actorForDeadlineChange = async (tx, req) => {
    const actor = await tx.user.findFirst({ where: {
        id: req.user.id, sessionVersion: req.sessionVersion, deletedAt: null,
        OR: [{ studioId: null }, { studio: { status: 'ACTIVE' } }],
    } });
    if (!actor) throw new AppError('La sesión ya no está disponible.', 401);
    return actor;
};
const readPrescriptionDate = details => {
    try { return JSON.parse(details || '{}')?.fechaPrescripcion; } catch { return undefined; }
};

export const confirmPrescription = async (req, res, next) => {
    try {
        const { date, deadlineId, version } = req.body ?? {};
        const dueDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseDeadlineDate(date) : null;
        if (!dueDate || (deadlineId !== undefined && (typeof deadlineId !== 'string' || !deadlineId.trim()))) {
            throw new AppError('Seleccioná una fecha de prescripción válida.', 400);
        }
        if (deadlineId && !validVersion(version)) throw new AppError('Actualizá los vencimientos antes de confirmar la fecha.', 400);

        const { deadline, created } = await prisma.$transaction(async tx => {
            const actor = await actorForDeadlineChange(tx, req);
            const caseId = req.params.id;
            const item = await tx.case.findFirst({ where: { id: caseId, ...caseScope(actor) }, select: { details: true } });
            if (!item) throw new AppError('Expediente no encontrado.', 404);
            if (!REVIEWER_ROLES.includes(actor.role)) throw new AppError('La confirmación requiere un perfil de abogado o administrador.', 403);
            if (readPrescriptionDate(item.details) !== date) throw new AppError(prescriptionConflict, 409);

            const linked = await tx.deadline.findUnique({ where: { caseId_source: { caseId, source: PRESCRIPTION_SOURCE } } });
            if (linked && deadlineId && linked.id !== deadlineId) throw new AppError(prescriptionConflict, 409);
            if (linked?.sourceDate === date) return { deadline: linked, created: false };
            if (linked && !deadlineId) throw new AppError(prescriptionConflict, 409);
            if (linked?.isCompleted) throw new AppError('Reabrí el vencimiento cumplido antes de confirmar la nueva fecha.', 409);

            const day = argentinaDayBounds(dueDate);
            const sameDay = { caseId, source: null, dueDate: { gte: day.todayStart, lt: day.tomorrowStart } };
            let existing = linked;
            if (!linked && deadlineId) {
                existing = await tx.deadline.findFirst({ where: { ...sameDay, id: deadlineId } });
                if (!existing) throw new AppError(prescriptionConflict, 409);
            } else {
                const candidates = await tx.deadline.findMany({ where: sameDay, select: { title: true } });
                if (candidates.some(candidate => /prescripci[oó]n/i.test(candidate.title))) {
                    throw new AppError(linked
                        ? 'Ya hay otro vencimiento de prescripción en la nueva fecha. Revisá ambos en la agenda antes de confirmar el cambio.'
                        : 'Ya hay un vencimiento de prescripción ese día. Actualizá los vencimientos y elegí el existente para vincularlo.', 409);
                }
            }

            const source = {
                source: PRESCRIPTION_SOURCE, sourceDate: date,
                sourceConfirmedAt: new Date(), sourceConfirmedById: actor.id,
            };
            let deadline;
            if (existing) {
                const changed = await tx.deadline.updateMany({
                    where: { id: existing.id, editVersion: version },
                    data: { ...source, ...(linked ? { dueDate } : {}), editVersion: { increment: 1 } },
                });
                if (changed.count !== 1) throw new AppError(prescriptionConflict, 409);
                deadline = await tx.deadline.findUnique({ where: { id: existing.id } });
            } else {
                deadline = await tx.deadline.create({ data: { ...source, caseId, title: prescriptionTitle, dueDate } });
            }
            await recordCaseActivity(tx, actor.id, caseId, 'Fecha de prescripción confirmada', `${date} · ${deadline.title}`);
            return { deadline, created: !existing };
        });
        return res.status(created ? 201 : 200).json(deadline);
    } catch (error) {
        if (error.code === 'P2002' || writeConflict(error)) return res.status(409).json({ message: prescriptionConflict });
        return next(error);
    }
};

const deadlineInput = (body, creating = false) => {
    const data = {};
    if (creating || body.title !== undefined) {
        if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) {
            return { error: 'Ingresá una descripción del plazo de hasta 200 caracteres' };
        }
        data.title = body.title.trim();
    }
    if (creating || body.dueDate !== undefined) {
        const dueDate = parseDeadlineDate(body.dueDate);
        if (!dueDate) return { error: 'Ingresá una fecha válida; si incluís la hora, indicá su zona horaria' };
        data.dueDate = dueDate;
    }
    if (body.notes !== undefined) {
        if (body.notes !== null && (typeof body.notes !== 'string' || body.notes.length > 10000)) {
            return { error: 'Las observaciones deben ser texto de hasta 10000 caracteres' };
        }
        data.notes = body.notes;
    }
    if (body.isCompleted !== undefined) {
        if (typeof body.isCompleted !== 'boolean') return { error: 'El estado de cumplimiento debe ser verdadero o falso' };
        data.isCompleted = body.isCompleted;
    }
    return { data };
};

// GET /api/cases/:id/deadlines  — Listar plazos de un expediente
export const getDeadlinesByCase = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const exp = await prisma.case.findFirst({ where: { id: caseId, ...caseScope(req.user) } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });

        const deadlines = await prisma.deadline.findMany({
            where: { caseId },
            orderBy: { dueDate: 'asc' },
        });
        res.json(deadlines);
    } catch (err) {
        next(err);
    }
};

// POST /api/cases/:id/deadlines  — Crear plazo
export const createDeadline = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const exp = await prisma.case.findFirst({ where: { id: caseId, ...caseScope(req.user) } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });
        const { data, error } = deadlineInput(req.body, true);
        if (error) return res.status(400).json({ message: error });

        const deadline = await prisma.$transaction(async tx => {
        const result = await tx.deadline.create({
            data: { ...data, caseId },
        });
        await recordCaseActivity(tx,req.user.id,caseId,'Vencimiento creado',result.title);
        return result;
        });
        res.status(201).json(deadline);
    } catch (err) {
        next(err);
    }
};

// PUT /api/deadlines/:id  — Actualizar/completar plazo
export const updateDeadline = async (req, res, next) => {
    try {
        const id = req.params.id;
        const body = req.body ?? {};
        const updated = await prisma.$transaction(async tx => {
            const actor = await actorForDeadlineChange(tx, req);
            const where = { id, case: caseScope(actor) };
            const current = await tx.deadline.findFirst({ where });
            if (!current) throw new AppError('Plazo no encontrado', 404);
            const { data, error } = deadlineInput(body);
            if (error) throw new AppError(error, 400);
            if (!validVersion(body.version)) throw new AppError('Actualizá los vencimientos antes de guardar.', 400);
            if (body.version !== current.editVersion) throw new AppError(deadlineConflict, 409);
            if (current.source === PRESCRIPTION_SOURCE && data.dueDate && data.dueDate.getTime() !== current.dueDate.getTime()) {
                throw new AppError('Actualizá la estimación en el expediente y confirmá la nueva fecha desde la ficha.', 409);
            }
            const changedFields = Object.keys(data).some(key => key === 'dueDate'
                ? data.dueDate.getTime() !== current.dueDate.getTime() : data[key] !== current[key]);
            if (!changedFields) return current;
            const result = await tx.deadline.updateMany({ where: { ...where, editVersion: body.version }, data: { ...data, editVersion: { increment: 1 } } });
            if (result.count !== 1) throw new AppError(deadlineConflict, 409);
            await recordCaseActivity(tx, actor.id, current.caseId, 'Vencimiento actualizado', data.title ?? current.title);
            return tx.deadline.findUnique({ where: { id } });
        });
        res.json(updated);
    } catch (err) {
        if (writeConflict(err)) return res.status(409).json({ message: deadlineConflict });
        next(err);
    }
};

// DELETE /api/deadlines/:id  — Eliminar plazo
export const deleteDeadline = async (req, res, next) => {
    try {
        const id = req.params.id;
        const version = req.body?.version;
        await prisma.$transaction(async tx => {
            const actor = await actorForDeadlineChange(tx, req);
            const where = { id, case: caseScope(actor) };
            const current = await tx.deadline.findFirst({ where });
            if (!current) throw new AppError('Plazo no encontrado', 404);
            if (!validVersion(version)) throw new AppError('Actualizá los vencimientos antes de eliminar el plazo.', 400);
            const result = await tx.deadline.deleteMany({ where: { ...where, editVersion: version } });
            if (result.count !== 1) throw new AppError(deadlineConflict, 409);
            await recordCaseActivity(tx, actor.id, current.caseId, 'Vencimiento eliminado', current.title);
        });
        res.json({ message: 'Plazo eliminado correctamente' });
    } catch (err) {
        if (writeConflict(err)) return res.status(409).json({ message: deadlineConflict });
        next(err);
    }
};

// GET /api/deadlines/upcoming  — Vencimientos próximos (48hs) del studio del usuario
export const getUpcomingDeadlines = async (req, res, next) => {
    try {
        const results = await checkDeadlinesForUser(req.user);
        res.json({ count: results.length, deadlines: results });
    } catch (err) {
        next(err);
    }
};

// GET /api/deadlines/my-day  — "Mi jornada": vencidos, hoy, próximos 7 días
// Usa el mismo acceso por estudio o titular independiente que los expedientes.
export const getMyDay = async (req, res, next) => {
    try {
        const tenantFilter = { case: caseScope(req.user) };
        const { todayStart, tomorrowStart, upcomingEnd } = argentinaDayBounds();

        // Campos a incluir del expediente (datos mínimos, no exponer info sensible)
        const caseInclude = {
            select: {
                id: true,
                caseNumber: true,
                title: true,
                fuero: true,
                studioId: true,
                assignedLawyer: { select: { id: true, name: true } },
            },
        };

        // Consultas en paralelo: atrasados, hoy, próximos 7 días
        const [overdue, today, upcoming] = await Promise.all([
            // Atrasados: vencimiento anterior a hoy, no completados
            prisma.deadline.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { lt: todayStart },
                    ...tenantFilter,
                },
                include: { case: caseInclude },
                orderBy: { dueDate: 'asc' },
            }),
            // Hoy: vencimiento entre inicio y fin del día
            prisma.deadline.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { gte: todayStart, lt: tomorrowStart },
                    ...tenantFilter,
                },
                include: { case: caseInclude },
                orderBy: { dueDate: 'asc' },
            }),
            // Próximos 7 días: desde mañana hasta 7 días
            prisma.deadline.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { gte: tomorrowStart, lt: upcomingEnd },
                    ...tenantFilter,
                },
                include: { case: caseInclude },
                orderBy: { dueDate: 'asc' },
            }),
        ]);

        // Formatear respuesta con datos mínimos
        const formatDeadline = (d) => ({
            id: d.id,
            title: d.title,
            dueDate: d.dueDate,
            editVersion: d.editVersion,
            notes: d.notes,
            caseId: d.caseId,
            caseNumber: d.case?.caseNumber || null,
            caseTitle: d.case?.title || null,
            fuero: d.case?.fuero || null,
            assignedLawyer: d.case?.assignedLawyer?.name || null,
        });

        res.json({
            overdue: overdue.map(formatDeadline),
            today: today.map(formatDeadline),
            upcoming: upcoming.map(formatDeadline),
            counts: {
                overdue: overdue.length,
                today: today.length,
                upcoming: upcoming.length,
                total: overdue.length + today.length + upcoming.length,
            },
        });
    } catch (err) {
        next(err);
    }
};
