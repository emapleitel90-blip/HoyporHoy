import prisma from '../utils/prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { canAccessStudio, STUDIO_STATUS, studioSuspendedMessage } from '../utils/studioAccess.js';

const generateToken = ({ id, role, sessionVersion }) => {
    return jwt.sign({ id, role, sessionVersion }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const register = async (req, res) => {
    const { name, email, password } = req.body;

    // Studio membership and privileged roles are managed by authenticated admins.
    if (Object.hasOwn(req.body, 'role') || Object.hasOwn(req.body, 'studioId')) {
        return res.status(400).json({ message: 'El registro público no permite asignar roles ni estudios' });
    }

    try {
        const userExists = await prisma.user.findUnique({
            where: { email },
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: 'OPERATOR',
                studioId: null,
            },
        });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                studioId: user.studioId,
                token: generateToken(user),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findFirst({
            where: { email, deletedAt: null },
            include: { studio: { select: { status: true } } },
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!canAccessStudio(user)) {
                return res.status(403).json({ message: studioSuspendedMessage });
            }
            const updated = await prisma.user.updateMany({
                where: {
                    id: user.id, deletedAt: null, sessionVersion: user.sessionVersion, studioId: user.studioId,
                    ...(user.studioId ? { studio: { status: STUDIO_STATUS.ACTIVE } } : {}),
                },
                data: { lastLogin: new Date() },
            });
            if (updated.count === 0) {
                return res.status(401).json({ message: 'La cuenta cambió. Volvé a iniciar sesión.' });
            }

            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                studioId: user.studioId,
                token: generateToken(user),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                studioId: true,
                createdAt: true,
            },
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user || user.deletedAt !== null) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const changed = await prisma.user.updateMany({
            where: {
                id: req.user.id, deletedAt: null, sessionVersion: req.sessionVersion, studioId: req.user.studioId,
                ...(req.user.studioId ? { studio: { status: STUDIO_STATUS.ACTIVE } } : {}),
            },
            data: { password: hashedPassword, sessionVersion: { increment: 1 } },
        });
        if (changed.count === 0) {
            return res.status(401).json({ message: 'Tu sesión ya no es válida. Volvé a iniciar sesión.' });
        }

        res.json({ message: 'Contraseña actualizada. Volvé a iniciar sesión.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
