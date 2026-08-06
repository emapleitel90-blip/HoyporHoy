import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';

export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { id: true, name: true, email: true, role: true, studioId: true, deletedAt: true }
            });

            if (!user || user.deletedAt !== null) {
                return res.status(401).json({ message: 'Not authorized, account is inactive' });
            }

            // No exponer deletedAt en req.user
            const { deletedAt: _, ...safeUser } = user;
            req.user = safeUser;

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
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
