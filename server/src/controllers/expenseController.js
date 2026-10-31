import { stat } from 'node:fs/promises';
import prisma from '../utils/prismaClient.js';
import { caseScope, participantScope } from '../utils/caseAccess.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { recordCaseActivity } from '../utils/recordCaseActivity.js';
import {
    caseFilePath, caseFileUrl, isPrivateCaseFile, originalFileName,
    validateCaseFileContent, removeStoredCaseFile,
} from '../utils/caseFileStorage.js';

const VALID_TYPES = ['TASA_JUSTICIA', 'PERITOS', 'MOVILIDAD', 'HONORARIOS', 'OTROS'];
const VALID_STATUSES = ['PENDING', 'PAID', 'REIMBURSED'];

const expenseInput = (body, creating = false) => {
    if (body.receiptUrl != null) throw new AppError('El comprobante debe cargarse como archivo, no como URL', 400);
    const data = {};
    if (creating || body.description !== undefined) {
        if (typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 1000) {
            throw new AppError('Ingresá una descripción de hasta 1000 caracteres', 400);
        }
        data.description = body.description.trim();
    }
    if (creating || body.amount !== undefined) {
        if (!['string', 'number'].includes(typeof body.amount) || !Number.isFinite(Number(body.amount)) || Number(body.amount) <= 0) {
            throw new AppError('El monto debe ser un número positivo y finito', 400);
        }
        data.amount = Number(body.amount);
    }
    if (creating || body.type !== undefined) {
        const type = body.type ?? 'OTROS';
        if (!VALID_TYPES.includes(type)) throw new AppError('Tipo de gasto inválido', 400);
        data.type = type;
    }
    if (!creating && body.status !== undefined) {
        if (!VALID_STATUSES.includes(body.status)) throw new AppError('Estado de gasto inválido', 400);
        data.status = body.status;
    }
    return data;
};

const withReceipts = async expenses => {
    const urls = expenses.map(item => item.receiptUrl).filter(Boolean);
    const files = urls.length ? await prisma.caseFile.findMany({
        where: { url: { in: urls }, caseId: { in: expenses.map(item => item.caseId) } },
    }) : [];
    return Promise.all(expenses.map(async expense => {
        const file = files.find(item => item.url === expense.receiptUrl && item.caseId === expense.caseId && isPrivateCaseFile(item));
        let receiptStatus = expense.receiptUrl ? (expense.receiptUrl.startsWith('/api/cases/files/') ? 'MISSING' : 'LEGACY') : 'NONE';
        if (file) {
            try { receiptStatus = (await stat(caseFilePath(file.id))).isFile() ? 'AVAILABLE' : 'MISSING'; }
            catch (error) { if (error.code !== 'ENOENT') throw error; receiptStatus = 'MISSING'; }
        }
        return { ...expense, receiptStatus, receipt: file ?? null };
    }));
};

const currentUser = async (tx, id) => {
    const user = await tx.user.findFirst({ where: { id, deletedAt: null }, select: { id: true, role: true, studioId: true } });
    if (!user) throw new AppError('La cuenta ya no está activa', 401);
    return user;
};
const saveReceipt = (tx, file, caseId) => tx.caseFile.create({ data: {
    id: file.filename, name: originalFileName(file.originalname), url: caseFileUrl(file.filename), caseId,
} });
const cleanup = async file => {
    if (!file) return;
    try { await removeStoredCaseFile(file.filename); }
    catch { console.error('[expenses] No se pudo limpiar una carga incompleta'); }
};
const savedExpense = (expense, receipt) => ({ ...expense,
    receiptStatus: receipt ? 'AVAILABLE' : 'NONE', receipt: receipt ?? null,
});

// Check access before accepting bytes, then recheck it inside the write transaction.
export const authorizeExpenseReceiptUpload = async (req, res, next) => {
    try {
        const expense = await prisma.expense.findFirst({ where: { id: req.params.id, case: caseScope(req.user) } });
        if (!expense) throw new AppError('Gasto no disponible', 404);
        next();
    } catch (error) { next(error); }
};

export const getExpensesByCase = async (req, res, next) => {
    try {
        const caseItem = await prisma.case.findFirst({ where: { id: req.params.id, ...caseScope(req.user) } });
        if (!caseItem) throw new AppError('Expediente no disponible', 404);
        const expenses = await prisma.expense.findMany({ where: { caseId: caseItem.id }, orderBy: { createdAt: 'desc' } });
        res.json({ expenses: await withReceipts(expenses), total: expenses.reduce((sum, item) => sum + item.amount, 0) });
    } catch (error) { next(error); }
};

export const createExpense = async (req, res, next) => {
    let saved = false;
    try {
        const data = expenseInput(req.body, true);
        if (req.file) await validateCaseFileContent(req.file);
        const result = await prisma.$transaction(async tx => {
            const user = await currentUser(tx, req.user.id);
            const caseItem = await tx.case.findFirst({ where: { id: req.params.id, ...caseScope(user) } });
            if (!caseItem) throw new AppError('Expediente no disponible', 404);
            const receipt = req.file ? await saveReceipt(tx, req.file, caseItem.id) : null;
            const expense = await tx.expense.create({ data: { ...data, caseId: caseItem.id, status: 'PENDING', receiptUrl: receipt?.url ?? null } });
            const recipient = caseItem.assignedLawyerId ? await tx.user.findFirst({
                where: { AND: [participantScope(caseItem), { id: caseItem.assignedLawyerId }] },
            }) : null;
            if (recipient) await tx.notification.create({ data: {
                title: '💰 Nuevo gasto registrado — ' + caseItem.caseNumber,
                message: req.user.name + ' · Gasto: "' + expense.description + '" por $' + expense.amount.toLocaleString('es-AR') + ' (' + expense.type + '). Estado: Pendiente de reintegro.',
                type: 'EXPENSE', userId: recipient.id, caseId: caseItem.id,
            } });
            await recordCaseActivity(tx,req.user.id,caseItem.id,'Gasto registrado',expense.description,recipient?[recipient.id]:[]);
            return savedExpense(expense, receipt);
        });
        saved = true;
        res.status(201).json(result);
    } catch (error) {
        if (!saved) await cleanup(req.file);
        next(error);
    }
};

export const attachExpenseReceipt = async (req, res, next) => {
    let saved = false;
    try {
        if (!req.file) throw new AppError('Seleccioná un comprobante para subir', 400);
        if (typeof req.body.version !== 'string' || Object.keys(req.body).some(key => key !== 'version')) {
            throw new AppError('Enviá el archivo y la versión del gasto', 400);
        }
        await validateCaseFileContent(req.file);
        const result = await prisma.$transaction(async tx => {
            const user = await currentUser(tx, req.user.id);
            const expense = await tx.expense.findFirst({ where: { id: req.params.id, case: caseScope(user) } });
            if (!expense) throw new AppError('Gasto no disponible', 404);
            if (expense.updatedAt.toISOString() !== req.body.version) throw new AppError('El gasto cambió. Actualizá e intentá de nuevo', 409);
            const receipt = await saveReceipt(tx, req.file, expense.caseId);
            const updatedAt = new Date(Math.max(Date.now(), expense.updatedAt.getTime() + 1));
            const updated = await tx.expense.updateMany({ where: { id: expense.id, updatedAt: expense.updatedAt },
                data: { receiptUrl: receipt.url, updatedAt } });
            if (updated.count !== 1) throw new AppError('El gasto cambió. Actualizá e intentá de nuevo', 409);
            await recordCaseActivity(tx,req.user.id,expense.caseId,'Comprobante de gasto incorporado',receipt.name);
            return savedExpense(await tx.expense.findUnique({ where: { id: expense.id } }), receipt);
        });
        saved = true;
        res.json(result);
    } catch (error) {
        if (!saved) await cleanup(req.file);
        next(error);
    }
};

export const updateExpense = async (req, res, next) => {
    try {
        const existing = await prisma.expense.findFirst({ where: { id: req.params.id, case: caseScope(req.user) } });
        if (!existing) throw new AppError('Gasto no disponible', 404);
        const data = expenseInput(req.body);
        const updated = await prisma.$transaction(async tx=>{
            const result=await tx.expense.update({ where: { id: existing.id }, data });
            if(Object.keys(data).some(key=>String(result[key])!==String(existing[key])))
                await recordCaseActivity(tx,req.user.id,existing.caseId,'Gasto actualizado',result.description);
            return result;
        });
        res.json((await withReceipts([updated]))[0]);
    } catch (error) { next(error); }
};
