import prisma from '../utils/prismaClient.js';

const tenantWhere = (user, extra = {}) => {
    const baseExtra = { ...extra, deletedAt: null };
    if (user.role === 'SUPER_ADMIN') return baseExtra;
    if (!user.studioId) {
        return { ...baseExtra, studioId: null, createdById: user.id };
    }
    return { ...baseExtra, studioId: user.studioId };
};

export const getGeneralStats = async (req, res, next) => {
    try {
        const where = tenantWhere(req.user);
        const totalCases = await prisma.case.count({ where });
        const openCases = await prisma.case.count({ where: { ...where, status: 'OPEN' } });
        const pendingCases = await prisma.case.count({ where: { ...where, status: 'PENDING' } });
        const urgentCases = await prisma.case.count({ where: { ...where, priority: 'URGENT', status: 'OPEN' } });
        
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

        res.json({
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
        const studioWhere = req.user.role === 'SUPER_ADMIN' ? {} : { studioId: req.user.studioId };
        const lawyers = await prisma.user.findMany({
            where: { role: 'LAWYER', ...studioWhere, deletedAt: null },
            select: {
                id: true,
                name: true,
                _count: {
                    select: { assignedCases: { where: { status: 'OPEN' } } }
                }
            }
        });
        res.json(lawyers);
    } catch (error) {
        next(error);
    }
};
