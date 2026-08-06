/**
 * Skill 1: Agente de Vencimientos
 * Busca deadlines próximos (48hs) y crea notificaciones internas para el abogado asignado.
 * Disparado por cron cada día a las 7:00 AM (America/Argentina/Cordoba).
 */
import prisma from '../utils/prismaClient.js';

export async function checkUpcomingDeadlines() {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Buscar plazos no completados cuyo vencimiento sea dentro de 48hs
    const upcomingDeadlines = await prisma.deadline.findMany({
        where: {
            isCompleted: false,
            dueDate: {
                gte: now,
                lte: in48h,
            },
        },
        include: {
            case: {
                include: {
                    assignedLawyer: { select: { id: true, name: true, email: true } },
                    studio: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (upcomingDeadlines.length === 0) {
        console.log('[DeadlineAgent] No hay vencimientos próximos en 48hs.');
        return { processed: 0, notifications: [] };
    }

    const notifications = [];

    for (const deadline of upcomingDeadlines) {
        const lawyer = deadline.case.assignedLawyer;
        if (!lawyer) continue; // Si no hay abogado asignado, omitir

        const hoursLeft = Math.round((new Date(deadline.dueDate) - now) / (1000 * 60 * 60));

        // Evitar notificaciones duplicadas (verificar si ya existe para este deadline hoy)
        const existing = await prisma.notification.findFirst({
            where: {
                userId: lawyer.id,
                caseId: deadline.caseId,
                type: 'DEADLINE_ALERT',
                createdAt: { gte: new Date(now.setHours(0, 0, 0, 0)) },
                message: { contains: `[Plazo ID: ${deadline.id}]` },
            },
        });

        if (existing) continue;

        const notification = await prisma.notification.create({
            data: {
                title: `⚠️ Vencimiento en ${hoursLeft}hs — ${deadline.case.caseNumber}`,
                message: `El plazo "${deadline.title}" vence el ${new Date(deadline.dueDate).toLocaleDateString('es-AR')} (en ${hoursLeft} horas). [Plazo ID: ${deadline.id}]`,
                type: 'DEADLINE_ALERT',
                userId: lawyer.id,
                caseId: deadline.caseId,
            },
        });

        notifications.push(notification);
        console.log(`[DeadlineAgent] Notificación creada para ${lawyer.name} — "${deadline.title}" (${hoursLeft}hs restantes)`);
    }

    return { processed: upcomingDeadlines.length, notifications };
}

/**
 * Versión manual del agente para endpoints de administración.
 * @param {number|null} studioId - Si se pasa, solo procesa ese estudio.
 */
export async function checkDeadlinesForStudio(studioId = null) {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const where = {
        isCompleted: false,
        dueDate: { gte: now, lte: in48h },
    };

    if (studioId) {
        where.case = { studioId };
    }

    const deadlines = await prisma.deadline.findMany({
        where,
        include: {
            case: {
                include: { assignedLawyer: { select: { id: true, name: true } } },
            },
        },
    });

    return deadlines.map(d => ({
        deadlineId: d.id,
        title: d.title,
        dueDate: d.dueDate,
        caseNumber: d.case.caseNumber,
        assignedLawyer: d.case.assignedLawyer?.name || 'Sin asignar',
    }));
}
