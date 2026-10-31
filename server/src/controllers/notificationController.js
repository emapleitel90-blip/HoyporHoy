// Controller: Notificaciones
import prisma from '../utils/prismaClient.js';
import { caseScope } from '../utils/caseAccess.js';
import { syncActivityNotifications } from '../utils/activityNotifications.js';
const visible = user => ({userId:user.id,OR:[{caseId:null},{case:caseScope(user)}]});

// GET /api/notifications  — Notificaciones del usuario autenticado
export const getNotifications = async (req, res, next) => {
    try {
        const cursor=req.query.cursor;
        if(cursor!==undefined&&(typeof cursor!=='string'||!cursor||cursor.length>128))return res.status(400).json({message:'Página de actividad inválida'});
        const anchor=cursor?await prisma.notification.findFirst({where:{id:cursor,...visible(req.user)},select:{id:true,createdAt:true}}):null;
        if(cursor&&!anchor)return res.status(404).json({message:'Esta página ya no está disponible. Volvé a los avisos más recientes.'});
        await syncActivityNotifications(prisma, req.user);
        const rows = await prisma.notification.findMany({
            where: {AND:[visible(req.user),...(anchor?[{OR:[{createdAt:{lt:anchor.createdAt}},{createdAt:anchor.createdAt,id:{gt:anchor.id}}]}]:[])]},
            orderBy: [{createdAt:'desc'},{id:'asc'}],
            take: 51,
            include: { case: { select: { id: true, caseNumber: true, title: true } } },
        });
        const notifications=rows.slice(0,50);
        const unread = await prisma.notification.count({where:{...visible(req.user),isRead:false}});
        res.set('Cache-Control','no-store');
        res.json({ notifications, unread, nextCursor:rows.length>50?notifications[49].id:null });
    } catch (err) {
        next(err);
    }
};

// PUT /api/notifications/:id/read  — Marcar como leída
export const markAsRead = async (req, res, next) => {
    try {
        const id = req.params.id;
        const notification = await prisma.notification.findFirst({ where: { id,...visible(req.user) } });
        if (!notification) return res.status(404).json({ message: 'Notificación no encontrada' });
        if (notification.userId !== req.user.id) return res.status(403).json({ message: 'No autorizado' });

        const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
        res.json(updated);
    } catch (err) {
        next(err);
    }
};

// PUT /api/notifications/mark-all-read  — Marcar todas como leídas
export const markAllRead = async (req, res, next) => {
    try {
        await prisma.notification.updateMany({
            where: { ...visible(req.user), isRead: false },
            data: { isRead: true },
        });
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (err) {
        next(err);
    }
};
