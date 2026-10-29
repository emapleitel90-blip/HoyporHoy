import { stat } from 'node:fs/promises';
import prisma from '../utils/prismaClient.js';
import { caseScope } from '../utils/caseAccess.js';
import { AppError } from '../middleware/errorMiddleware.js';
import {
    caseFilePath, caseFileUrl, isPrivateCaseFile, originalFileName,
    fileMime, validateCaseFileContent, removeStoredCaseFile,
} from '../utils/caseFileStorage.js';

export const addCaseFile = async (req, res, next) => {
    let saved = false;
    try {
        if (!req.file) throw new AppError('Seleccioná un archivo para subir', 400);
        await validateCaseFileContent(req.file);
        // Recheck inside the write transaction in case access changed during the upload.
        const file = await prisma.$transaction(async (tx) => {
            const currentUser = await tx.user.findFirst({ where: { id: req.user.id, deletedAt: null },
                select: { id: true, role: true, studioId: true } });
            if (!currentUser) throw new AppError('La cuenta ya no está activa', 401);
            const caseItem = await tx.case.findFirst({ where: { id: req.params.id, ...caseScope(currentUser) } });
            if (!caseItem) throw new AppError('Expediente no disponible', 404);
            return tx.caseFile.create({ data: {
                id: req.file.filename, name: originalFileName(req.file.originalname),
                url: caseFileUrl(req.file.filename), caseId: caseItem.id,
            } });
        });
        saved = true;
        res.status(201).json(file);
    } catch (error) {
        if (req.file && !saved) {
            try { await removeStoredCaseFile(req.file.filename); }
            catch { console.error('[caseFiles] No se pudo limpiar una carga incompleta'); }
        }
        next(error);
    }
};

export const downloadCaseFile = async (req, res, next) => {
    try {
        const file = await prisma.caseFile.findFirst({
            where: { id: req.params.fileId, case: caseScope(req.user) },
        });
        if (!file) throw new AppError('Archivo no disponible', 404);
        if (!isPrivateCaseFile(file)) throw new AppError('Este registro anterior no tiene un archivo privado cargado', 409);
        const storedPath = caseFilePath(file.id);
        try {
            const info = await stat(storedPath);
            if (!info.isFile()) throw new AppError('El contenido del archivo no está disponible', 404);
        } catch (error) {
            if (error.code === 'ENOENT') throw new AppError('El contenido del archivo no está disponible', 404);
            throw error;
        }
        res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
            'Content-Type': fileMime(file.name) || 'application/octet-stream' });
        res.download(storedPath, originalFileName(file.name), (error) => {
            if (error && !res.headersSent) next(error.code === 'ENOENT'
                ? new AppError('El contenido del archivo no está disponible', 404) : error);
        });
    } catch (error) { next(error); }
};

export const deleteCaseFile = async (req, res, next) => {
    try {
        const file = await prisma.caseFile.findFirst({
            where: { id: req.params.fileId, case: caseScope(req.user) },
        });
        if (!file) throw new AppError('Archivo no disponible', 404);
        // Delete metadata first: even if storage cleanup fails, the bytes stay private.
        try { await prisma.$transaction(async tx => {
            const receipt = await tx.expense.findFirst({ where: { receiptUrl: file.url, caseId: file.caseId } });
            if (receipt) throw new AppError('El archivo es un comprobante de gasto. Cargá su reemplazo desde Gastos antes de eliminarlo.', 409);
            const paymentReceipt = await tx.feePaymentReceipt.findFirst({ where: { fileId: file.id } });
            if (paymentReceipt) throw new AppError('El archivo forma parte del historial de un pago de honorarios y debe conservarse.', 409);
            await tx.caseFile.delete({ where: { id: file.id } });
        }); }
        catch (error) {
            if (error.code === 'P2003') throw new AppError('El archivo está vinculado a un seguimiento. Reabrí ese seguimiento y desvinculalo antes de eliminarlo.', 409);
            throw error;
        }
        let cleanupPending = false;
        if (isPrivateCaseFile(file)) {
            try { await removeStoredCaseFile(file.id); }
            catch { cleanupPending = true; console.error('[caseFiles] Limpieza de almacenamiento pendiente'); }
        }
        res.json({ message: cleanupPending ? 'Registro eliminado; limpieza del archivo pendiente' : 'Archivo eliminado', cleanupPending });
    } catch (error) { next(error); }
};
