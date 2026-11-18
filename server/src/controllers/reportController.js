import prisma from '../utils/prismaClient.js';
import { caseScope } from '../utils/caseAccess.js';
import { urgentOpenCase } from '../utils/casePriority.js';

export const getGeneralStats = async (req, res, next) => {
    try {
        const where = caseScope(req.user);
        const totalCases = await prisma.case.count({ where });
        const openCases = await prisma.case.count({ where: { ...where, status: 'OPEN' } });
        const pendingCases = await prisma.case.count({ where: { ...where, status: 'PENDING' } });
        const urgentCases = await prisma.case.count({ where: { ...where, ...urgentOpenCase } });
        
        const byStatusRaw = await prisma.case.groupBy({
            by: ['status'],
            _count: { _all: true },
            where
        });

        const byFueroRaw = await prisma.case.groupBy({
            by: ['fuero'],
            _count: { _all: true },
            where
        });

        // Formatear la data para el frontend
        const byStatus = byStatusRaw.map(s => ({
            name: s.status,
            count: s._count._all
        }));

        const byFuero = byFueroRaw.map(f => ({
            name: f.fuero || 'Sin asignar',
            value: f._count._all
        }));

        // Obtener casos recientes para la tabla
        const recentCases = await prisma.case.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        res.set('Cache-Control', 'private, no-store').json({
            total: totalCases,
            open: openCases,
            pending: pendingCases,
            urgent: urgentCases,
            byStatus,
            byFuero,
            recent: recentCases
        });
    } catch (error) {
        next(error);
    }
};

export const getCaseLoadByLawyer = async (req, res, next) => {
    try {
        const user = req.user;
        // The platform admin sees all active lawyers. Studio members see their
        // team, and independent lawyers see only their own workload.
        const lawyerScope = user.role === 'SUPER_ADMIN'
            ? {}
            : user.studioId ? { studioId: user.studioId } : { id: user.id, studioId: null };
        const openCases = { ...caseScope(user), status: 'OPEN' };

        const lawyers = await prisma.user.findMany({
            where: { role: 'LAWYER', deletedAt: null, ...lawyerScope },
            select: {
                id: true,
                name: true,
                _count: {
                    select: { assignedCases: { where: openCases } }
                }
            }
        });
        res.set('Cache-Control', 'private, no-store').json(lawyers);
    } catch (error) {
        next(error);
    }
};
