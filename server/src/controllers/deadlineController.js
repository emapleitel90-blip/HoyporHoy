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
