import bcrypt from 'bcryptjs';
import prisma from '../utils/prismaClient.js';
import { hashAccessToken, issueAccountLink } from '../utils/accountAccessLinks.js';
import { STUDIO_STATUS, canAccessStudio } from '../utils/studioAccess.js';

const invalidLink = 'El enlace venció, ya se usó o fue reemplazado. Pedí uno nuevo a la administración.';
class InvalidAccountLink extends Error {}

export async function issueRecoveryLink(req, res, next) {
    try {
        const account = await prisma.user.findUnique({
            where: { email: req.body.email },
            include: { studio: { select: { status: true } } },
        });
        if (!account || account.deletedAt || account.role === 'SUPER_ADMIN' || !canAccessStudio(account)) {
            return res.status(404).json({ message: 'No hay una cuenta habilitada para recuperar con ese correo.' });
        }
        const link = await issueAccountLink(prisma, account, 'RECOVERY');
        return res.set('Cache-Control', 'no-store').status(201).json(link);
    } catch (error) {
        return next(error);
    }
}

export async function redeemAccountLink(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        const tokenHash = hashAccessToken(req.body.token);
        const link = await prisma.accountAccessLink.findUnique({ where: { tokenHash } });
        if (!link || link.expiresAt <= new Date()) throw new InvalidAccountLink();

        const password = await bcrypt.hash(req.body.password, 10);
        await prisma.$transaction(async tx => {
            const consumed = await tx.accountAccessLink.deleteMany({
                where: { tokenHash, expiresAt: { gt: new Date() } },
            });
            if (!consumed.count) throw new InvalidAccountLink();

            const updated = await tx.user.updateMany({
                where: {
                    id: link.userId,
                    role: { not: 'SUPER_ADMIN' },
                    deletedAt: null,
                    sessionVersion: link.sessionVersion,
                    studioId: link.studioId,
                    ...(link.studioId ? { studio: { status: STUDIO_STATUS.ACTIVE } } : {}),
                },
                data: { password, sessionVersion: { increment: 1 } },
            });
            if (!updated.count) throw new InvalidAccountLink();
        });
        return res.json({ message: 'Guardamos tu contraseña. Ya podés iniciar sesión.' });
    } catch (error) {
        if (error instanceof InvalidAccountLink) return res.status(400).json({ message: invalidLink });
        return next(error);
    }
}
