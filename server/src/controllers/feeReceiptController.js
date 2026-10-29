import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import prisma from '../utils/prismaClient.js';
import { caseScope, REVIEWER_ROLES } from '../utils/caseAccess.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { feeAgreementInclude, presentFees, advanceVersion } from './feeController.js';
import { validateCaseFileContent, originalFileName, caseFileUrl, removeStoredCaseFile } from '../utils/caseFileStorage.js';

const writable = user => {
    if (!REVIEWER_ROLES.includes(user.role)) throw new AppError('Adjuntar comprobantes de pagos requiere un abogado o administrador', 403);
};
const findPayment = async (db, id, user) => {
    const payment = await db.feePayment.findFirst({ where: { id,
        installment: { agreement: { case: caseScope(user) } },
    }, include: { reversal: true, installment: { include: { agreement: true } } } });
    if (!payment) throw new AppError('Pago no disponible', 404);
    if (payment.reversal) throw new AppError('El pago está anulado. Sus comprobantes se conservan para consulta.', 409);
    return payment;
};
const mappedError = error => {
    if (['P2021', 'P2022'].includes(error.code)) return new AppError('Los comprobantes requieren aplicar la migración de honorarios', 503);
    if (['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code)) return new AppError('El acuerdo cambió. Actualizá antes de volver a adjuntar el comprobante.', 409);
    return error;
};
// Authorize before accepting bytes, then re-read active user and case after upload.
export const authorizePaymentReceiptUpload = async (req, res, next) => {
    try {
        writable(req.user);
        await findPayment(prisma, req.params.id, req.user);
        next();
    } catch (error) { next(mappedError(error)); }
};
export const attachPaymentReceipt = async (req, res, next) => {
    let kept = false;
    const cleanup = async () => {
        if (!req.file || kept) return;
        try { await removeStoredCaseFile(req.file.filename); }
        catch { console.error('[feeReceipts] No se pudo limpiar una carga incompleta'); }
    };
    try {
        if (!req.file) throw new AppError('Seleccioná un comprobante para subir', 400);
        if (Object.keys(req.body).some(key => !['expectedVersion', 'requestId', 'reason'].includes(key)) ||
            typeof req.body.expectedVersion !== 'string' || !/^[1-9]\d*$/.test(req.body.expectedVersion)) {
            throw new AppError('Enviá el archivo, la versión del acuerdo y el identificador de solicitud', 400);
        }
        const expectedVersion = Number(req.body.expectedVersion);
        if (!Number.isSafeInteger(expectedVersion)) throw new AppError('Versión del acuerdo inválida', 400);
        const requestId = req.body.requestId;
        if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new AppError('Identificador de solicitud inválido', 400);
        const rawReason = req.body.reason ?? '';
        if (typeof rawReason !== 'string' || rawReason.length > 2000) throw new AppError('El motivo admite hasta 2000 caracteres', 400);
        const reason = rawReason.trim();
        await validateCaseFileContent(req.file);
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(req.file.path)) hash.update(chunk);
        const contentHash = hash.digest('hex');
        const name = originalFileName(req.file.originalname);
        const result = await prisma.$transaction(async tx => {
            const user = await tx.user.findFirst({ where: { id: req.user.id, deletedAt: null },
                select: { id: true, name: true, role: true, studioId: true } });
            if (!user) throw new AppError('La cuenta ya no está activa', 401);
            writable(user);
            const payment = await findPayment(tx, req.params.id, user);
            const agreement = payment.installment.agreement;
            const prior = await tx.feePaymentReceipt.findUnique({ where: { paymentId_requestId: { paymentId: payment.id, requestId } }, include: { file: true } });
            if (prior) {
                if (prior.contentHash !== contentHash || prior.file.name !== name || prior.reason !== reason || prior.previousVersion !== expectedVersion) {
                    throw new AppError('Ese identificador corresponde a otro comprobante. Actualizá antes de adjuntar otro archivo.', 409);
                }
                return { kept: false, agreement: await tx.feeAgreement.findUnique({ where: { id: agreement.id }, include: feeAgreementInclude }) };
            }
            if (agreement.version !== expectedVersion) throw new AppError('El acuerdo o sus pagos cambiaron. Actualizá antes de adjuntar el comprobante.', 409);
            const latest = await tx.feePaymentReceipt.findFirst({ where: { paymentId: payment.id }, orderBy: { sequence: 'desc' } });
            if (latest && !reason) throw new AppError('Indicá el motivo del reemplazo del comprobante', 400);
            await advanceVersion(tx, agreement);
            const file = await tx.caseFile.create({ data: { id: req.file.filename, name,
                url: caseFileUrl(req.file.filename), caseId: agreement.caseId } });
            await tx.feePaymentReceipt.create({ data: { paymentId: payment.id, fileId: file.id,
                sequence: (latest?.sequence || 0) + 1, requestId, reason, previousVersion: expectedVersion, contentHash,
                uploadedById: user.id, uploadedByName: user.name } });
            return { kept: true, agreement: await tx.feeAgreement.findUnique({ where: { id: agreement.id }, include: feeAgreementInclude }) };
        });
        kept = result.kept;
        await cleanup();
        res.json(await presentFees(result.agreement));
    } catch (error) {
        await cleanup();
        next(mappedError(error));
    }
};
