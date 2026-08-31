// Controller: Deadlines
import prisma from '../utils/prismaClient.js';
import { checkDeadlinesForStudio } from '../skills/deadlineAgent.js';

// GET /api/cases/:id/deadlines  — Listar plazos de un expediente
export const getDeadlinesByCase = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const exp = await prisma.case.findUnique({ where: { id: caseId } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });

        // Tenant isolation
        if (req.user.role !== 'SUPER_ADMIN' && exp.studioId !== req.user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

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
        const { title, dueDate, notes } = req.body;
        if (!title || !dueDate) return res.status(400).json({ message: 'title y dueDate son requeridos' });

        const exp = await prisma.case.findUnique({ where: { id: caseId } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN' && exp.studioId !== req.user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const deadline = await prisma.deadline.create({
            data: { title, dueDate: new Date(dueDate), notes, caseId },
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
        const { title, dueDate, notes, isCompleted } = req.body;
        const existing = await prisma.deadline.findUnique({ where: { id }, include: { case: true } });
        if (!existing) return res.status(404).json({ message: 'Plazo no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN' && existing.case.studioId !== req.user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const updated = await prisma.deadline.update({
            where: { id },
            data: {
                title: title ?? existing.title,
                dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
                notes: notes ?? existing.notes,
                isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
            },
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
        const existing = await prisma.deadline.findUnique({ where: { id }, include: { case: true } });
        if (!existing) return res.status(404).json({ message: 'Plazo no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN' && existing.case.studioId !== req.user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        await prisma.deadline.delete({ where: { id } });
        res.json({ message: 'Plazo eliminado correctamente' });
    } catch (err) {
        next(err);
    }
};

// GET /api/deadlines/upcoming  — Vencimientos próximos (48hs) del studio del usuario
export const getUpcomingDeadlines = async (req, res, next) => {
    try {
        const studioId = req.user.role === 'SUPER_ADMIN' ? null : req.user.studioId;
        const results = await checkDeadlinesForStudio(studioId);
        res.json({ count: results.length, deadlines: results });
    } catch (err) {
        next(err);
    }
};

// GET /api/deadlines/my-day  — "Mi jornada": vencidos, hoy, próximos 7 días
// Multi-tenancy: se filtra por case.studioId del usuario autenticado.
// No acepta studioId desde el frontend.
export const getMyDay = async (req, res, next) => {
    try {
        // Construir el filtro de tenant seguro (solo desde el token, nunca del frontend)
        const tenantFilter = {};
        if (req.user.role !== 'SUPER_ADMIN') {
            tenantFilter.case = { studioId: req.user.studioId, deletedAt: null };
        } else {
            tenantFilter.case = { deletedAt: null };
        }

        // Calcular los límites de fecha en zona horaria de Córdoba
        // Usamos offsets manuales para no agregar dependencias (America/Argentina/Cordoba = UTC-3)
        const nowUtc = new Date();
        const cordobaOffsetMs = -3 * 60 * 60 * 1000;
        const nowCordoba = new Date(nowUtc.getTime() + cordobaOffsetMs);

        // Inicio y fin del día de hoy en Córdoba
        const todayStartCordoba = new Date(nowCordoba);
        todayStartCordoba.setHours(0, 0, 0, 0);
        const todayEndCordoba = new Date(nowCordoba);
        todayEndCordoba.setHours(23, 59, 59, 999);

        // Convertir a UTC para consultar la BD
        const todayStartUtc = new Date(todayStartCordoba.getTime() - cordobaOffsetMs);
        const todayEndUtc = new Date(todayEndCordoba.getTime() - cordobaOffsetMs);

        // Límite de 7 días futuros (desde mañana)
        const in7daysEndCordoba = new Date(todayEndCordoba);
        in7daysEndCordoba.setDate(in7daysEndCordoba.getDate() + 7);
        const in7daysEndUtc = new Date(in7daysEndCordoba.getTime() - cordobaOffsetMs);

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
                    dueDate: { lt: todayStartUtc },
                    ...tenantFilter,
                },
                include: { case: caseInclude },
                orderBy: { dueDate: 'asc' },
            }),
            // Hoy: vencimiento entre inicio y fin del día
            prisma.deadline.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { gte: todayStartUtc, lte: todayEndUtc },
                    ...tenantFilter,
                },
                include: { case: caseInclude },
                orderBy: { dueDate: 'asc' },
            }),
            // Próximos 7 días: desde mañana hasta 7 días
            prisma.deadline.findMany({
                where: {
                    isCompleted: false,
                    dueDate: { gt: todayEndUtc, lte: in7daysEndUtc },
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
