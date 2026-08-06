import prisma from '../utils/prismaClient.js';
import bcrypt from 'bcryptjs';

export const getStudios = async (req, res) => {
    try {
        const studios = await prisma.studio.findMany({
            include: {
                _count: {
                    select: { users: true, cases: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(studios);
    } catch (error) {
        res.status(500).json({ message: 'Server error al obtener estudios' });
    }
};

export const createStudio = async (req, res) => {
    try {
        const { name, cuit, email, packagePlan } = req.body;

        // Check if studio with CUIT exists
        const studioExists = await prisma.studio.findUnique({ where: { cuit } });
        if (studioExists) {
            return res.status(400).json({ message: 'Ya existe un estudio con ese CUIT' });
        }

        // Crear el estudio y su admin inicial en una transacción
        const salt = await bcrypt.genSalt(10);
        // Default password for new studios
        const defaultPassword = 'changeme123';
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        const result = await prisma.$transaction(async (tx) => {
            const newStudio = await tx.studio.create({
                data: {
                    name,
                    cuit,
                    email,
                    package: packagePlan || 'BASIC',
                    status: 'ACTIVE'
                }
            });

            const newAdmin = await tx.user.create({
                data: {
                    name: `Admin de ${name}`,
                    email: email,
                    password: hashedPassword,
                    role: 'ADMIN',
                    studioId: newStudio.id
                }
            });

            return { studio: newStudio, adminEmail: newAdmin.email, defaultPassword };
        });

        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Error al crear el estudio' });
    }
};

export const getStudioById = async (req, res) => {
    try {
        const studio = await prisma.studio.findUnique({
            where: { id: req.params.id },
            include: {
                users: { select: { id: true, name: true, email: true, role: true, lastLogin: true } }
            }
        });
        if (studio) res.json(studio);
        else res.status(404).json({ message: 'Studio not found' });
    } catch (error) {
        res.status(500).json({ message: 'Server error al actualizar el estudio' });
    }
};

export const updateStudioStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updatedStudio = await prisma.studio.update({
            where: { id },
            data: { status }
        });

        res.json(updatedStudio);
    } catch (error) {
        res.status(500).json({ message: 'Server error al archivar el estudio' });
    }
};

export const getStudioUsers = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'SUPER_ADMIN' && req.user.studioId !== id) {
            return res.status(403).json({ message: 'No autorizado para ver usuarios de este estudio' });
        }

        const users = await prisma.user.findMany({
            where: { studioId: id, deletedAt: null },
            select: { id: true, name: true, email: true, role: true, lastLogin: true, createdAt: true }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error al crear el usuario' });
    }
};

export const createStudioUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, role } = req.body;

        if (req.user.role !== 'SUPER_ADMIN' && req.user.studioId !== id) {
            return res.status(403).json({ message: 'No autorizado para crear usuarios en este estudio' });
        }

        const userExists = await prisma.user.findUnique({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'Ya existe un usuario con ese email' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const validRole = ['ADMIN', 'LAWYER', 'OPERATOR'].includes(role) ? role : 'OPERATOR';

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: passwordHash,
                role: validRole,
                studioId: id
            },
            select: { id: true, name: true, email: true, role: true }
        });

        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: 'Server error al actualizar el usuario' });
    }
};

export const deactivateStudioUser = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN' && req.user.studioId !== user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { deletedAt: new Date() }
        });

        res.json({ message: 'Usuario desactivado correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Server error al eliminar el usuario' });
    }
};
