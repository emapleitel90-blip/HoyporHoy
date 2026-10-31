// Controller: Deadlines
import prisma from '../utils/prismaClient.js';
import { checkDeadlinesForUser } from '../skills/deadlineAgent.js';
import { caseScope } from '../utils/caseAccess.js';
import { argentinaDayBounds, parseDeadlineDate } from '../utils/argentinaTime.js';
import { recordCaseActivity } from '../utils/recordCaseActivity.js';

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
        const existing = await prisma.deadline.findFirst({ where: { id, case: caseScope(req.user) } });
        if (!existing) return res.status(404).json({ message: 'Plazo no encontrado' });
        const { data, error } = deadlineInput(req.body);
        if (error) return res.status(400).json({ message: error });

        const updated = await prisma.$transaction(async tx => {
        const result = await tx.deadline.update({
            where: { id },
            data,
        });
        if(Object.keys(data).some(key=>String(result[key])!==String(existing[key])))
            await recordCaseActivity(tx,req.user.id,existing.caseId,'Vencimiento actualizado',result.title);
        return result;
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/deadlines/:id  — Eliminar plazo
export const deleteDeadline = async (req, res, next) => {
    try {
        const id = req.params.id;
        const existing = await prisma.deadline.findFirst({ where: { id, case: caseScope(req.user) } });
        if (!existing) return res.status(404).json({ message: 'Plazo no encontrado' });

        await prisma.$transaction(async tx=>{
            await tx.deadline.delete({ where: { id } });
            await recordCaseActivity(tx,req.user.id,existing.caseId,'Vencimiento eliminado',existing.title);
        });
        res.json({ message: 'Plazo eliminado correctamente' });
    } catch (err) {
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
