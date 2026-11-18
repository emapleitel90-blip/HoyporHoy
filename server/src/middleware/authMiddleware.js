import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';
import { canAccessStudio, studioSuspendedMessage } from '../utils/studioAccess.js';

export const protect = async (req, res, next) => {
    const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '')?.[1];
    if (!token) return res.status(401).json({ message: 'Not authorized, no token' });

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
    if (typeof decoded?.id !== 'string' || !decoded.id) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true, name: true, email: true, role: true, studioId: true,
                deletedAt: true, sessionVersion: true, studio: { select: { status: true } },
            },
        });
        if (!user || user.deletedAt !== null) {
            return res.status(401).json({ message: 'Not authorized, account is inactive' });
        }
        if (!canAccessStudio(user)) {
            return res.status(403).json({ message: studioSuspendedMessage });
        }
        // Tokens issued before this change belong to version zero.
        const tokenVersion = decoded.sessionVersion === undefined ? 0 : decoded.sessionVersion;
        if (tokenVersion !== user.sessionVersion) {
            return res.status(401).json({ message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' });
        }

        const { deletedAt: _deletedAt, studio: _studio, sessionVersion, ...safeUser } = user;
        req.user = safeUser;
        req.sessionVersion = sessionVersion;
    } catch (error) {
        return next(error);
    }
    return next();
};

export const superAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as super admin' });
    }
};

export const admin = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

export const lawyer = (req, res, next) => {
    if (req.user && (req.user.role === 'LAWYER' || req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as a lawyer' });
    }
};
