import prisma from '../utils/prismaClient.js';

// Helper: build tenant-scoped where clause.
// SUPER_ADMIN can see everything; everyone else is restricted to their studio.
const tenantWhere = (user, extra = {}) => {
    const baseExtra = { ...extra, deletedAt: null };
    if (user.role === 'SUPER_ADMIN') return baseExtra;
    if (!user.studioId) {
        // Independent mode: only see cases created by the user where studioId is null
        return { ...baseExtra, studioId: null, createdById: user.id };
    }
    return { ...baseExtra, studioId: user.studioId };
};

export const getCases = async (req, res) => {
    try {
        let where = tenantWhere(req.user);

        // Filtros opcionales por query params
        if (req.query.status) where.status = req.query.status;
        if (req.query.fuero) where.fuero = req.query.fuero;
        if (req.query.priority) where.priority = req.query.priority;
        if (req.query.search) {
            where.OR = [
                { clientName: { contains: req.query.search } },
                { title: { contains: req.query.search } },
                { caseNumber: { contains: req.query.search } },
            ];
        }

        const cases = await prisma.case.findMany({
            where,
            include: {
                studio: true,
                assignedLawyer: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(cases);
    } catch (error) {
        console.error('[getCases]', error);
        res.status(500).json({ message: 'Error al obtener expedientes' });
    }
};

export const getCaseStats = async (req, res) => {
    try {
        let where = tenantWhere(req.user);

        const [total, open, closed, urgent, byFuero, byStatus, recent] = await Promise.all([
            prisma.case.count({ where }),
            prisma.case.count({ where: { ...where, status: 'OPEN' } }),
            prisma.case.count({ where: { ...where, status: 'CLOSED' } }),
            prisma.case.count({ where: { ...where, priority: 'URGENT' } }),
            prisma.case.groupBy({ by: ['fuero'], where: { ...where, fuero: { not: null } }, _count: { fuero: true } }),
            prisma.case.groupBy({ by: ['status'], where, _count: { status: true } }),
            prisma.case.findMany({
                where,
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, clientName: true, title: true, status: true, fuero: true, score: true, createdAt: true }
            })
        ]);

        const pending = total - open - closed;

        res.json({
            total,
            open,
            closed,
            pending: pending > 0 ? pending : 0,
            urgent,
            byFuero: byFuero.map(f => ({ name: f.fuero || 'Sin Fuero', value: f._count.fuero })),
            byStatus: byStatus.map(s => ({ name: s.status, count: s._count.status })),
            recent
        });
    } catch (error) {
        console.error('[getCaseStats]', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};

export const createCase = async (req, res) => {
    try {
        const { title, clientName, details, description, studioId, assignedLawyerId, fuero, score } = req.body;

        const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

        const caseNumber = `CAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Determine studioId: priority: body > authenticated user
        const finalStudioId = studioId || req.user.studioId || null;

        const newCase = await prisma.case.create({
            data: {
                caseNumber,
                title: title || (clientName ? `Caso de ${clientName}` : 'Nuevo Caso'),
                clientName,
                details: detailsString,
                description,
                status: 'OPEN',
                fuero: fuero || null,
                score: score ? Number(score) : null,
                studioId: finalStudioId,
                assignedLawyerId: assignedLawyerId || null,
                createdById: req.user.id
            },
        });
        res.status(201).json(newCase);
    } catch (error) {
        console.error('Error creating case:', error);
        res.status(400).json({ message: error.message });
    }
};

export const updateCase = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, clientName, details, description, status, assignedLawyerId, fuero, score } = req.body;

        const existingCase = await prisma.case.findUnique({ where: { id } });

        if (!existingCase) {
            return res.status(404).json({ message: 'Case not found' });
        }

        // If NOT SUPER_ADMIN, check if the user belongs to the studio OR is the creator if independent
        if (req.user.role !== 'SUPER_ADMIN') {
            if (existingCase.studioId) {
                if (existingCase.studioId !== req.user.studioId) {
                    return res.status(403).json({ message: 'No autorizado para actualizar este expediente de estudio' });
                }
            } else if (existingCase.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado para actualizar este expediente independiente' });
            }
        }

        const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;

        const updatedCase = await prisma.case.update({
            where: { id },
            data: {
                title,
                clientName,
                details: detailsString,
                description,
                status,
                fuero: fuero || undefined,
                score: score !== undefined ? Number(score) : undefined,
                assignedLawyerId: assignedLawyerId || undefined,
            },
        });

        res.json(updatedCase);
    } catch (error) {
        console.error('Error updating case:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getCaseById = async (req, res) => {
    try {
        const caseItem = await prisma.case.findUnique({
            where: { id: req.params.id },
            include: {
                studio: true,
                assignedLawyer: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } },
                files: true,
                deadlines: { orderBy: { dueDate: 'asc' } },
                timelineEvents: { orderBy: { eventDate: 'asc' } }
            }
        });

        if (!caseItem) return res.status(404).json({ message: 'Case not found' });

        // If NOT SUPER_ADMIN, check if the user belongs to the studio OR is the creator if independent
        if (req.user.role !== 'SUPER_ADMIN') {
            if (caseItem.studioId) {
                if (caseItem.studioId !== req.user.studioId) {
                    return res.status(403).json({ message: 'No autorizado para ver este expediente de estudio' });
                }
            } else if (caseItem.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado para ver este expediente independiente' });
            }
        }

        res.json(caseItem);
    } catch (error) {
        console.error('Error en getCaseById:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar caso' });
    }
};

export const addCaseFile = async (req, res) => {
    try {
        const { id: caseId } = req.params;
        const { name, url } = req.body;

        if (!name || !url) return res.status(400).json({ message: 'Name and URL are required' });

        const caseItem = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseItem) return res.status(404).json({ message: 'Case not found' });

        if (req.user.role !== 'SUPER_ADMIN') {
            if (caseItem.studioId) {
                if (caseItem.studioId !== req.user.studioId) {
                    return res.status(403).json({ message: 'No autorizado' });
                }
            } else if (caseItem.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado' });
            }
        }

        const newFile = await prisma.caseFile.create({
            data: { name, url, caseId }
        });

        res.status(201).json(newFile);
    } catch (error) {
        console.error('[addCaseFile]', error);
        res.status(500).json({ message: 'Error al agregar archivo' });
    }
};

export const deleteCaseFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        const file = await prisma.caseFile.findUnique({
            where: { id: fileId },
            include: { case: true }
        });

        if (!file) return res.status(404).json({ message: 'Archivo no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN') {
            if (file.case.studioId) {
                if (file.case.studioId !== req.user.studioId) {
                    return res.status(403).json({ message: 'No autorizado' });
                }
            } else if (file.case.createdById !== req.user.id) {
                return res.status(403).json({ message: 'No autorizado' });
            }
        }

        await prisma.caseFile.delete({ where: { id: fileId } });

        res.json({ message: 'Archivo eliminado' });
    } catch (error) {
        console.error('[deleteCaseFile]', error);
        res.status(500).json({ message: 'Error al eliminar archivo' });
    }
};

export const importCases = async (req, res) => {
    try {
        const { cases } = req.body;
        if (!cases || !Array.isArray(cases)) {
            return res.status(400).json({ message: 'Se requiere un arreglo de casos' });
        }

        const studioId = req.user.studioId || null;
        
        // Prepare the array for transaction
        const operations = cases.map(c => {
            const caseNumber = `CAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            return prisma.case.create({
                data: {
                    caseNumber,
                    title: c.title || (c.clientName ? `Caso de ${c.clientName}` : 'Caso Importado'),
                    clientName: c.clientName || null,
                    description: c.description || null,
                    status: c.status || 'OPEN',
                    fuero: c.fuero || null,
                    score: c.score ? Number(c.score) : null,
                    studioId: studioId,
                    createdById: req.user.id
                }
            });
        });

        // Execute all creates in a transaction
        const importedCases = await prisma.$transaction(operations);

        res.status(201).json({ 
            message: `${importedCases.length} casos importados exitosamente`,
            count: importedCases.length
        });
    } catch (error) {
        console.error('Error importing cases:', error);
        res.status(500).json({ message: 'Error interno al importar casos' });
    }
};
