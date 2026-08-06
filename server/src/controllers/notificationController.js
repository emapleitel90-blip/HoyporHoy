// Controller: Notificaciones
import prisma from '../utils/prismaClient.js';

// GET /api/notifications  — Notificaciones del usuario autenticado
export const getNotifications = async (req, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { case: { select: { id: true, caseNumber: true, title: true } } },
        });
        const unread = notifications.filter(n => !n.isRead).length;
        res.json({ notifications, unread });
    } catch (err) {
        next(err);
    }
};

// PUT /api/notifications/:id/read  — Marcar como leída
export const markAsRead = async (req, res, next) => {
    try {
        const id = req.params.id;
        const notification = await prisma.notification.findUnique({ where: { id } });
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
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.json({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (err) {
        next(err);
    }
};
