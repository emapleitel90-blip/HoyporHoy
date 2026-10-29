import multer from 'multer';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import prisma from '../utils/prismaClient.js';
import { caseScope } from '../utils/caseAccess.js';
import { AppError } from './errorMiddleware.js';
import { acceptsCaseFile, caseFilesDirectory, MAX_CASE_FILE_SIZE } from '../utils/caseFileStorage.js';

// Check access before Multer reads or writes any file content.
export const authorizeCaseFileUpload = async (req, res, next) => {
    try {
        const caseItem = await prisma.case.findFirst({ where: { id: req.params.id, ...caseScope(req.user) } });
        if (!caseItem) return res.status(404).json({ message: 'Expediente no disponible' });
        next();
    } catch (error) { next(error); }
};

export const fileReceiver = (fields = 0) => {
    const receive = multer({
        storage: multer.diskStorage({
            destination: (req, file, done) => {
                const directory = caseFilesDirectory();
                mkdir(directory, { recursive: true }).then(() => done(null, directory), done);
            },
            filename: (req, file, done) => done(null, randomUUID()),
        }),
        limits: { fileSize: MAX_CASE_FILE_SIZE, files: 1, fields, fieldSize: 10000 },
        fileFilter: (req, file, done) => {
            try { acceptsCaseFile(file); done(null, true); }
            catch (error) { done(error); }
        },
    }).single('file');

    return (req, res, next) => receive(req, res, (error) => {
        if (!error) return next();
        if (error instanceof multer.MulterError) {
            return next(new AppError(error.code === 'LIMIT_FILE_SIZE'
                ? 'El archivo supera el límite de 20 MB'
                : 'Enviá un único archivo en el campo file', error.code === 'LIMIT_FILE_SIZE' ? 413 : 400));
        }
        if (['Unexpected end of form', 'Multipart: Boundary not found', 'Malformed part header'].includes(error.message)) {
            return next(new AppError('El formulario de carga está incompleto o es inválido', 400));
        }
        next(error);
    });
};

export const receiveCaseFile = fileReceiver();
