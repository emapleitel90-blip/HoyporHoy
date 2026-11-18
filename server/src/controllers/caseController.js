import prisma from '../utils/prismaClient.js';
import { caseScope, participantScope, REVIEWER_ROLES } from '../utils/caseAccess.js';
import { recordCaseActivity } from '../utils/recordCaseActivity.js';
import { randomUUID, createHash } from 'node:crypto';
import { AppError } from '../middleware/errorMiddleware.js';
import { createNextActionTask, nextActionSelect, readNextActionInput } from './caseWorkflowController.js';
import { legacyCasePriority, urgentOpenCase, validateCasePriority } from '../utils/casePriority.js';
import { readCaseUpdate } from '../utils/caseUpdateInput.js';

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
        const priority = validateCasePriority(req.query.priority === '' ? undefined : req.query.priority);
        if (priority) where.priority = priority;
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
                nextAction: { select: nextActionSelect },
                studio: true,
                assignedLawyer: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(cases);
    } catch (error) {
        if (error instanceof AppError) return res.status(error.statusCode).json({ message: error.message });
        console.error('[getCases]', error);
        res.status(500).json({ message: 'Error al obtener expedientes' });
    }
};

export const getCaseStats = async (req, res) => {
    try {
        let where = tenantWhere(req.user);

        const [total, open, closed, pending, urgent, byFuero, byStatus, recent] = await Promise.all([
            prisma.case.count({ where }),
            prisma.case.count({ where: { ...where, status: 'OPEN' } }),
            prisma.case.count({ where: { ...where, status: 'CLOSED' } }),
            prisma.case.count({ where: { ...where, status: 'PENDING' } }),
            prisma.case.count({ where: { ...where, ...urgentOpenCase } }),
            prisma.case.groupBy({ by: ['fuero'], where: { ...where, fuero: { notIn: [''] } }, _count: { fuero: true } }),
            prisma.case.groupBy({ by: ['status'], where, _count: { status: true } }),
            prisma.case.findMany({
                where,
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, clientName: true, title: true, status: true, fuero: true, score: true, createdAt: true }
            })
        ]);

        res.json({
            total,
            open,
            closed,
            pending,
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

const createdCaseInclude = {
    assignedLawyer: { select: { id: true, name: true, email: true, role: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    nextAction: { select: nextActionSelect },
};

export const createCase = async (req, res) => {
    try {
        const { title, clientName, details, description, studioId, assignedLawyerId, fuero, score, requestId, nextAction } = req.body;
        if (requestId !== undefined && (typeof requestId !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(requestId))) {
            throw new AppError('Identificador de guardado inválido.', 400);
        }
        if (requestId && (typeof title !== 'string' || !title.trim() || title.length > 200 ||
            typeof clientName !== 'string' || !clientName.trim() || clientName.length > 200)) {
            throw new AppError('Ingresá el nombre del cliente y el asunto, con hasta 200 caracteres cada uno.', 400);
        }
        const actionInput = nextAction == null ? null : readNextActionInput(nextAction);
        const detailsString = typeof details === 'object' ? JSON.stringify(details) : details;
        const requestedPriority = validateCasePriority(req.body.priority);
        const priority = requestedPriority ?? legacyCasePriority(details);

        const { item, reused } = await prisma.$transaction(async tx => {
            const actor = await tx.user.findFirst({ where: {
                id: req.user.id, deletedAt: null, sessionVersion: req.sessionVersion,
                OR: [{ studioId: null }, { studio: { status: 'ACTIVE' } }],
            } });
            if (!actor) throw new AppError('La sesión ya no está disponible.', 401);
            const finalStudioId = actor.role === 'SUPER_ADMIN' ? (studioId || null) : actor.studioId;
            const payloadHash = requestId ? createHash('sha256').update(JSON.stringify({
                title, clientName, detailsString, description, assignedLawyerId, fuero, score, actionInput, finalStudioId,
                priority: requestedPriority,
            })).digest('hex') : null;

            if (requestId) {
                const previous = await tx.caseCreationRequest.findUnique({
                    where: { actorId_requestId: { actorId: actor.id, requestId } },
                });
                if (previous) {
                    if (previous.payloadHash !== payloadHash) throw new AppError('Ese guardado ya corresponde a otros datos.', 409);
                    const existing = await tx.case.findFirst({
                        where: { id: previous.caseId, ...caseScope(actor) }, include: createdCaseInclude,
                    });
                    if (!existing) throw new AppError('El expediente guardado ya no está disponible.', 409);
                    return { item: existing, reused: true };
                }
            }

            let validAssignedLawyerId = null;
            if (assignedLawyerId) {
                if (typeof assignedLawyerId !== 'string') throw new AppError('Responsable inválido', 400);
                const targetUser = await tx.user.findFirst({
                    where: { AND: [
                        participantScope({ studioId: finalStudioId, createdById: actor.id }),
                        { id: assignedLawyerId, role: { in: REVIEWER_ROLES } },
                    ] },
                });
                if (!targetUser) throw new AppError('El abogado asignado no existe, está inactivo o no pertenece a este estudio', 400);
                validAssignedLawyerId = targetUser.id;
            }

            const created = await tx.case.create({
                data: {
                    caseNumber: `CAS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    title: title || (clientName ? `Caso de ${clientName}` : 'Nuevo Caso'),
                    clientName, details: detailsString, description, status: 'OPEN', priority, fuero: fuero || null,
                    score: score ? Number(score) : null, studioId: finalStudioId,
                    assignedLawyerId: validAssignedLawyerId, createdById: actor.id,
                    ...(requestId ? { creationRequest: { create: { actorId: actor.id, requestId, payloadHash } } } : {}),
                },
                include: createdCaseInclude,
            });
            await recordCaseActivity(tx, actor.id, created.id, 'Expediente creado', created.caseNumber);
            if (actionInput) {
                const action = await createNextActionTask(tx, created, actor, actionInput);
                const linked = await tx.case.update({ where: { id: created.id }, data: { nextActionId: action.id } });
                await recordCaseActivity(tx, actor.id, created.id, 'Próxima acción actualizada', action.title);
                return { item: { ...created, ...linked, nextAction: action }, reused: false };
            }
            return { item: created, reused: false };
        });
        return res.status(reused ? 200 : 201).json(item);
    } catch (error) {
        if (error.statusCode || error.status) return res.status(error.statusCode || error.status).json({ message: error.message });
        if (['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code)) {
            return res.status(409).json({ message: 'No se pudo confirmar el alta. Reintentá con los mismos datos.' });
        }
        if (error.name === 'PrismaClientValidationError' || error.code === 'P2003') {
            return res.status(400).json({ message: 'Revisá los datos del expediente.' });
        }
        console.error('[createCase]', error.code || error.name);
        return res.status(500).json({ message: 'No se pudo guardar el expediente.' });
    }
};


const caseUpdateConflict = 'El expediente cambió desde que lo abriste. Revisá la versión guardada antes de volver a editar.';
const caseFieldNames = {
    title: 'título', clientName: 'cliente', details: 'datos del formulario', description: 'descripción', status: 'estado',
    priority: 'prioridad', fuero: 'fuero', score: 'puntaje', assignedLawyerId: 'abogado responsable',
};
const updatedCaseInclude = {
    ...createdCaseInclude,
    createdBy: { select: { id: true, name: true, email: true, role: true } },
};

export const updateCase = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCase = await prisma.$transaction(async tx => {
            const actor = await tx.user.findFirst({ where: {
                id: req.user.id, sessionVersion: req.sessionVersion, deletedAt: null,
                OR: [{ studioId: null }, { studio: { status: 'ACTIVE' } }],
            } });
            if (!actor) throw new AppError('La sesión ya no está disponible.', 401);
            const current = await tx.case.findUnique({ where: { id } });
            if (!current || current.deletedAt) throw new AppError('Expediente no encontrado.', 404);
            const scope = caseScope(actor);
            if (actor.role !== 'SUPER_ADMIN' && (current.studioId !== scope.studioId ||
                (scope.createdById && current.createdById !== scope.createdById))) {
                throw new AppError('No autorizado para actualizar este expediente.', 403);
            }
            const { version, data } = readCaseUpdate(req.body ?? {});
            if (version !== current.editVersion) throw new AppError(caseUpdateConflict, 409);
            if (data.assignedLawyerId && data.assignedLawyerId !== current.assignedLawyerId) {
                const targetUser = await tx.user.findFirst({ where: {
                    AND: [participantScope(current), { id: data.assignedLawyerId, role: { in: REVIEWER_ROLES } }],
                } });
                if (!targetUser) throw new AppError('El abogado asignado no existe, está inactivo o no pertenece a este estudio.', 400);
            }
            if (data.priority === undefined && data.details !== undefined) {
                const legacyPriority = legacyCasePriority(data.details);
                if (legacyPriority !== legacyCasePriority(current.details)) data.priority = legacyPriority;
            }

            const changes = Object.keys(caseFieldNames).filter(key => data[key] !== undefined && data[key] !== current[key]);
            if (changes.length) {
                const result = await tx.case.updateMany({
                    where: { id, ...scope, editVersion: version },
                    data: { ...data, editVersion: { increment: 1 } },
                });
                if (result.count !== 1) throw new AppError(caseUpdateConflict, 409);
                await recordCaseActivity(tx, actor.id, id, 'Expediente actualizado', 'Cambios en: ' + changes.map(key => caseFieldNames[key]).join(', '));
            }
            return tx.case.findUnique({ where: { id }, include: updatedCaseInclude });
        });
        res.json(updatedCase);
    } catch (error) {
        if (error instanceof AppError) return res.status(error.statusCode).json({ message: error.message });
        if (['P2034', 'P2028', 'P1008'].includes(error.code)) return res.status(409).json({ message: caseUpdateConflict });
        console.error('Error updating case:', error);
        res.status(500).json({ message: 'No se pudo actualizar el expediente.' });
    }
};

export const getCaseById = async (req, res) => {
    try {
        const caseItem = await prisma.case.findUnique({
            where: { id: req.params.id },
            include: {
                studio: true,
                assignedLawyer: { select: { id: true, name: true, email: true } },
                createdBy: { select: { id: true, name: true, email: true, role: true } },
                files: true,
                deadlines: { orderBy: { dueDate: 'asc' } },
                timelineEvents: { orderBy: { eventDate: 'asc' } }
            }
        });

        if (!caseItem || caseItem.deletedAt) return res.status(404).json({ message: 'Case not found' });

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

export { addCaseFile, deleteCaseFile } from './caseFileController.js';

export const importCases = async (req, res) => {
    try {
        const { cases } = req.body;
        if (!Array.isArray(cases) || !cases.length || cases.some(item=>!item||typeof item!=='object'||Array.isArray(item))) {
            return res.status(400).json({ message: 'Se requiere un arreglo con expedientes válidos para importar' });
        }
        const requestId=req.body.requestId;
        if(requestId!==undefined&&(typeof requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)))
            return res.status(400).json({message:'Identificador de importación inválido'});
        const payloadHash=createHash('sha256').update(JSON.stringify(cases)).digest('hex');
        const importedCases = await prisma.$transaction(async tx=>{
        const actor=await tx.user.findFirst({where:{id:req.user.id,deletedAt:null}});
        if(!actor)throw new AppError('La cuenta ya no está activa',401);
        const scope=actor.studioId?'studio:'+actor.studioId:'user:'+actor.id;
        if(requestId){
            const prior=await tx.caseImportRequest.findUnique({where:{userId_requestId:{userId:actor.id,requestId}}});
            if(prior){
                if(prior.scope!==scope||prior.payloadHash!==payloadHash)throw new AppError('Esta solicitud corresponde a otro lote o estudio',409);
                return {count:prior.count,replayed:true};
            }
        }
        const results=[];
        for(const c of cases){
            const caseNumber = `CAS-${Date.now()}-${randomUUID()}`;
            results.push(await tx.case.create({
                data: {
                    caseNumber,
                    title: c.title || (c.clientName ? `Caso de ${c.clientName}` : 'Caso Importado'),
                    clientName: c.clientName || null,
                    description: c.description || null,
                    status: c.status || 'OPEN',
                    fuero: c.fuero || null,
                    score: c.score ? Number(c.score) : null,
                    studioId: actor.studioId || null,
                    createdById: actor.id
                }
            }));
        }
        await recordCaseActivity(tx,actor.id,results[0].id,'Importación de expedientes completada',
            `${results.length} expedientes incorporados. Consultalos en Gestión de Expedientes.`,[],'IMPORT');
        if(requestId)await tx.caseImportRequest.create({data:{userId:actor.id,requestId,scope,payloadHash,count:results.length}});
        return {count:results.length,replayed:false};
        },{timeout:30000});

        res.status(importedCases.replayed?200:201).json({
            message: `${importedCases.count} casos importados exitosamente`,
            count: importedCases.count,
            ...(requestId?{requestId,replayed:importedCases.replayed}:{})
        });
    } catch (error) {
        console.error('Error importing cases:', error);
        if(['P2002','P2034','P2028','P1008'].includes(error.code))return res.status(409).json({message:'La importación cambió o sigue en curso. Reintentá con los mismos datos.'});
        if(['P2021','P2022'].includes(error.code))return res.status(503).json({message:'Falta aplicar la actualización de importaciones'});
        res.status(error.statusCode||500).json({ message: error.isOperational?error.message:'Error interno al importar casos' });
    }
};
