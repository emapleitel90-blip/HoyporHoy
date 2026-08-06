// Controller: Gastos — Skill 4 Conciliador
import prisma from '../utils/prismaClient.js';

const VALID_TYPES = ['TASA_JUSTICIA', 'PERITOS', 'MOVILIDAD', 'HONORARIOS', 'OTROS'];
const VALID_STATUSES = ['PENDING', 'PAID', 'REIMBURSED'];

// GET /api/cases/:id/expenses
export const getExpensesByCase = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const exp = await prisma.case.findUnique({ where: { id: caseId } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN') {
            if (exp.studioId) {
                if (exp.studioId !== req.user.studioId) return res.status(403).json({ message: 'No autorizado' });
            } else if (exp.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado (expediente independiente)' });
            }
        }

        const expenses = await prisma.expense.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
        });
        const total = expenses.reduce((acc, e) => acc + e.amount, 0);
        res.json({ expenses, total });
    } catch (err) {
        next(err);
    }
};

// POST /api/cases/:id/expenses
export const createExpense = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const { description, amount, type = 'OTROS', receiptUrl } = req.body;
        if (!description || !amount) return res.status(400).json({ message: 'description y amount son requeridos' });
        if (isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ message: 'amount debe ser un número positivo' });
        }

        const exp = await prisma.case.findUnique({ where: { id: caseId } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN') {
            if (exp.studioId) {
                if (exp.studioId !== req.user.studioId) return res.status(403).json({ message: 'No autorizado' });
            } else if (exp.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado (expediente independiente)' });
            }
        }

        const finalType = VALID_TYPES.includes(type) ? type : 'OTROS';

        const expense = await prisma.expense.create({
            data: { description, amount: Number(amount), type: finalType, receiptUrl, caseId, status: 'PENDING' },
        });

        // Notificar al abogado asignado sobre el nuevo gasto
        if (exp.assignedLawyerId) {
            await prisma.notification.create({
                data: {
                    title: `💰 Nuevo gasto registrado — ${exp.caseNumber}`,
                    message: `Gasto: "${description}" por $${Number(amount).toLocaleString('es-AR')} (${finalType}). Estado: Pendiente de reintegro.`,
                    type: 'EXPENSE',
                    userId: exp.assignedLawyerId,
                    caseId,
                },
            });
        }

        res.status(201).json(expense);
    } catch (err) {
        next(err);
    }
};

// PUT /api/expenses/:id
export const updateExpense = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status, description, amount, receiptUrl } = req.body;

        const existing = await prisma.expense.findUnique({ where: { id }, include: { case: true } });
        if (!existing) return res.status(404).json({ message: 'Gasto no encontrado' });
        if (req.user.role !== 'SUPER_ADMIN') {
            if (existing.case.studioId) {
                if (existing.case.studioId !== req.user.studioId) return res.status(403).json({ message: 'No autorizado' });
            } else if (existing.case.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado (expediente independiente)' });
            }
        }

        const finalStatus = status && VALID_STATUSES.includes(status) ? status : existing.status;

        const updated = await prisma.expense.update({
            where: { id },
            data: {
                status: finalStatus,
                description: description ?? existing.description,
                amount: amount !== undefined ? Number(amount) : existing.amount,
                receiptUrl: receiptUrl ?? existing.receiptUrl,
            },
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};
