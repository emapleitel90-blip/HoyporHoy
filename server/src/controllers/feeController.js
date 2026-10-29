import prisma from '../utils/prismaClient.js';
import { stat } from 'node:fs/promises';
import { caseFilePath, isPrivateCaseFile } from '../utils/caseFileStorage.js';
import { caseScope, REVIEWER_ROLES } from '../utils/caseAccess.js';
import { argentinaDayBounds, parseDeadlineDate } from '../utils/argentinaTime.js';
import { AppError } from '../middleware/errorMiddleware.js';

const financialInclude = { installments: { orderBy: { position: 'asc' }, include: {
    payments: { orderBy: { createdAt: 'asc' }, include: { reversal: true } },
} } };
const include = { installments: { ...financialInclude.installments, include: {
    payments: { ...financialInclude.installments.include.payments, include: {
        reversal: true, receipts: { orderBy: { sequence: 'desc' }, include: { file: true } },
    } },
} }, amendments: { orderBy: { version: 'desc' } } };
export const feeAgreementInclude = include;
const text = (value, max, required = true) => {
    if ((!required && value == null) || (!required && value === '')) return '';
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AppError('Texto requerido o demasiado largo', 400);
    return value.trim();
};
export const moneyCents = value => {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) throw new AppError('Ingresá un importe decimal positivo con hasta dos decimales', 400);
    const [whole, fraction = ''] = value.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (cents <= 0 || cents > 2000000000) throw new AppError('Importe fuera de rango: máximo $20.000.000 por cuota o pago', 400);
    return cents;
};
const dateOnly = value => {
    const result = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseDeadlineDate(value);
    if (!result) throw new AppError('Ingresá una fecha válida (AAAA-MM-DD)', 400);
    return result;
};
const checkCase = async (db, user, id) => {
    const item = await db.case.findFirst({ where: { id, ...caseScope(user) } });
    if (!item) throw new AppError('Expediente no encontrado', 404);
    return item;
};
const writable = user => { if (!REVIEWER_ROLES.includes(user.role)) throw new AppError('El registro de acuerdos y pagos requiere un abogado o administrador', 403); };
const paymentRequestId = value => {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new AppError('Identificador de solicitud inválido', 400);
    return value;
};
const present = agreement => {
    if (!agreement) return null;
    const installments = agreement.installments.map(item => ({ ...item, balanceCents: item.amountCents - item.paidCents,
        status: item.paidCents === item.amountCents ? 'PAID' : item.paidCents > 0 ? 'PARTIAL' : 'PENDING' }));
    const amendments = (agreement.amendments || []).map(({ beforeData, afterData, requestData: _requestData, ...entry }) => ({
        ...entry, before: JSON.parse(beforeData), after: JSON.parse(afterData),
    }));
    return { ...agreement, amendments, installments, totalCents: installments.reduce((sum, item) => sum + item.amountCents, 0),
        paidCents: installments.reduce((sum, item) => sum + item.paidCents, 0),
        balanceCents: installments.reduce((sum, item) => sum + item.balanceCents, 0) };
};
export const presentFees = async agreement => {
    const result = present(agreement);
    if (!result) return null;
    result.installments = await Promise.all(result.installments.map(async installment => ({ ...installment,
        payments: await Promise.all(installment.payments.map(async payment => ({ ...payment,
            receipts: await Promise.all((payment.receipts || []).map(async ({ contentHash: _contentHash, ...receipt }) => {
                let fileStatus = 'MISSING';
                if (receipt.file && isPrivateCaseFile(receipt.file)) {
                    try { if ((await stat(caseFilePath(receipt.file.id))).isFile()) fileStatus = 'AVAILABLE'; }
                    catch (error) { if (error.code !== 'ENOENT') throw error; }
                }
                return { ...receipt, fileStatus };
            })),
        }))),
    })));
    return result;
};
export const advanceVersion = async (tx, agreement) => {
    const changed = await tx.feeAgreement.updateMany({ where: { id: agreement.id, version: agreement.version },
        data: { version: { increment: 1 } } });
    if (changed.count !== 1) throw new AppError('El acuerdo cambió. Actualizá antes de reintentar.', 409);
};
const agreementSnapshot = agreement => ({ description: agreement.description, currency: agreement.currency,
    installments: agreement.installments.map(({ id, position, amountCents, paidCents, dueDate }) => ({
        id, position, amountCents, paidCents, dueDate: dueDate.toISOString(),
    })),
});
const handle = fn => async (req, res, next) => {
    try { await fn(req, res); }
    catch (error) {
        if (error.code === 'P2021' || error.code === 'P2022') return next(new AppError('Honorarios requiere aplicar la migración de la base de datos', 503));
        if (['P2002', 'P2034', 'P2028', 'P1008'].includes(error.code)) return next(new AppError('Los datos cambiaron o ya existen. Actualizá antes de reintentar.', 409));
        next(error);
    }
};
export const getFees = handle(async (req, res) => {
    await checkCase(prisma, req.user, req.params.caseId);
    res.json(await presentFees(await prisma.feeAgreement.findUnique({ where: { caseId: req.params.caseId }, include })));
});
export const createAgreement = handle(async (req, res) => {
    writable(req.user);
    const result = await prisma.$transaction(async tx => {
        await checkCase(tx, req.user, req.params.caseId);
        const description = text(req.body.description, 2000);
        if (!Array.isArray(req.body.installments) || !req.body.installments.length || req.body.installments.length > 60) throw new AppError('Registrá entre 1 y 60 cuotas', 400);
        const installments = req.body.installments.map((item, index) => {
            if (!item || typeof item !== 'object') throw new AppError('Cuota inválida', 400);
            return { position: index + 1, amountCents: moneyCents(item.amount), dueDate: dateOnly(item.dueDate) };
        });
        return tx.feeAgreement.create({ data: { caseId: req.params.caseId, description, createdById: req.user.id,
            installments: { create: installments } }, include });
    });
    res.status(201).json(await presentFees(result));
});
export const recordPayment = handle(async (req, res) => {
    writable(req.user);
    const result = await prisma.$transaction(async tx => {
        const item = await tx.feeInstallment.findUnique({ where: { id: req.params.id }, include: { agreement: true } });
        if (!item) throw new AppError('Cuota no encontrada', 404);
        await checkCase(tx, req.user, item.agreement.caseId);
        const amountCents = moneyCents(req.body.amount);
        const paidAt = dateOnly(req.body.paidAt);
        if (paidAt >= argentinaDayBounds().tomorrowStart) throw new AppError('Un pago recibido no puede tener fecha futura', 400);
        const notes = text(req.body.notes, 2000, false);
        const requestId = paymentRequestId(req.body.requestId);
        const prior = await tx.feePayment.findUnique({ where: { installmentId_requestId: { installmentId: item.id, requestId } }, include: { reversal: true } });
        if (prior) {
            if (prior.reversal) throw new AppError('Ese pago fue anulado. Actualizá el expediente y registrá una nueva solicitud si corresponde.', 409);
            if (prior.amountCents !== amountCents || prior.paidAt.getTime() !== paidAt.getTime() || (prior.notes || '') !== notes) throw new AppError('Ese identificador ya corresponde a otro pago', 409);
        } else {
            await advanceVersion(tx, item.agreement);
            // Atomic balance guard prevents overpayment even across competing requests.
            const changed = await tx.feeInstallment.updateMany({ where: { id: item.id, amountCents: item.amountCents, paidCents: { lte: item.amountCents - amountCents } },
                data: { paidCents: { increment: amountCents } } });
            if (changed.count !== 1) throw new AppError('El pago supera el saldo pendiente. Actualizá la cuota.', 409);
            await tx.feePayment.create({ data: { installmentId: item.id, requestId, amountCents, paidAt, notes, registeredById: req.user.id } });
        }
        return tx.feeAgreement.findUnique({ where: { id: item.agreementId }, include });
    });
    res.json(await presentFees(result));
});
export const reversePayment = handle(async (req, res) => {
    writable(req.user);
    const result = await prisma.$transaction(async tx => {
        const payment = await tx.feePayment.findUnique({ where: { id: req.params.id }, include: {
            reversal: true, installment: { include: { agreement: true } },
        } });
        if (!payment) throw new AppError('Pago no encontrado', 404);
        const item = payment.installment;
        await checkCase(tx, req.user, item.agreement.caseId);
        const reason = text(req.body.reason, 2000);
        const requestId = paymentRequestId(req.body.requestId);
        if (payment.reversal) {
            if (payment.reversal.requestId !== requestId || payment.reversal.reason !== reason) {
                throw new AppError('El pago ya fue anulado. Actualizá para consultar el motivo y el saldo.', 409);
            }
        } else {
            await advanceVersion(tx, item.agreement);
            // The ledger entry is immutable. Counter and audit record commit together.
            const changed = await tx.feeInstallment.updateMany({
                where: { id: item.id, paidCents: { gte: payment.amountCents } },
                data: { paidCents: { decrement: payment.amountCents } },
            });
            if (changed.count !== 1) throw new AppError('El saldo cambió. Actualizá antes de anular el pago.', 409);
            await tx.feePaymentReversal.create({ data: {
                paymentId: payment.id, requestId, reason,
                registeredById: req.user.id, registeredByName: req.user.name,
            } });
        }
        return tx.feeAgreement.findUnique({ where: { id: item.agreementId }, include });
    });
    res.json(await presentFees(result));
});
export const amendAgreement = handle(async (req, res) => {
    writable(req.user);
    const result = await prisma.$transaction(async tx => {
        await checkCase(tx, req.user, req.params.caseId);
        const agreement = await tx.feeAgreement.findUnique({ where: { caseId: req.params.caseId }, include });
        if (!agreement) throw new AppError('Acuerdo no encontrado', 404);
        const requestId = paymentRequestId(req.body.requestId);
        const expectedVersion = req.body.expectedVersion;
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new AppError('Versión del acuerdo inválida', 400);
        const description = text(req.body.description, 2000);
        const reason = text(req.body.reason, 2000);
        if (!Array.isArray(req.body.installments) || !req.body.installments.length || req.body.installments.length > 60) throw new AppError('Registrá entre 1 y 60 cuotas', 400);
        const installments = req.body.installments.map(item => {
            if (!item || typeof item !== 'object' || (item.id !== undefined && (typeof item.id !== 'string' || !item.id))) throw new AppError('Cuota inválida', 400);
            return { id: item.id || null, amountCents: moneyCents(item.amount), dueDate: dateOnly(item.dueDate).toISOString() };
        });
        const requestData = JSON.stringify({ expectedVersion, description, reason, installments });
        const prior = await tx.feeAgreementAmendment.findUnique({ where: { agreementId_requestId: { agreementId: agreement.id, requestId } } });
        if (prior) {
            if (prior.requestData !== requestData) throw new AppError('Ese identificador corresponde a otra modificación del acuerdo', 409);
            return agreement;
        }
        if (agreement.version !== expectedVersion) throw new AppError('El acuerdo o sus pagos cambiaron. Actualizá y revisá los importes antes de guardar.', 409);
        const previous = agreementSnapshot(agreement);
        for (let index = 0; index < agreement.installments.length; index++) {
            const current = agreement.installments[index];
            const proposed = installments[index];
            if (!proposed || proposed.id !== current.id) throw new AppError('Conservá todas las cuotas existentes y su orden', 400);
            if (proposed.amountCents < current.paidCents) throw new AppError('El importe de una cuota no puede ser menor a lo ya abonado', 400);
        }
        if (installments.slice(agreement.installments.length).some(item => item.id !== null)) throw new AppError('Las cuotas nuevas no deben tener identificador previo', 400);
        const hasChanges = description !== agreement.description || installments.length !== agreement.installments.length ||
            agreement.installments.some((item, index) => item.amountCents !== installments[index].amountCents || item.dueDate.toISOString() !== installments[index].dueDate);
        if (!hasChanges) throw new AppError('No hay cambios para guardar', 400);
        await advanceVersion(tx, agreement);
        await tx.feeAgreement.update({ where: { id: agreement.id }, data: { description } });
        for (let index = 0; index < installments.length; index++) {
            const item = installments[index];
            if (item.id) {
                await tx.feeInstallment.update({ where: { id: item.id }, data: { amountCents: item.amountCents, dueDate: new Date(item.dueDate) } });
            } else {
                await tx.feeInstallment.create({ data: { agreementId: agreement.id, position: index + 1,
                    amountCents: item.amountCents, dueDate: new Date(item.dueDate) } });
            }
        }
        const updated = await tx.feeAgreement.findUnique({ where: { id: agreement.id }, include });
        await tx.feeAgreementAmendment.create({ data: { agreementId: agreement.id, requestId, requestData, reason,
            previousVersion: agreement.version, version: updated.version,
            registeredById: req.user.id, registeredByName: req.user.name,
            beforeData: JSON.stringify(previous), afterData: JSON.stringify(agreementSnapshot(updated)),
        } });
        return tx.feeAgreement.findUnique({ where: { id: agreement.id }, include });
    });
    res.json(await presentFees(result));
});
export const upcomingFees = handle(async (req, res) => {
    const { upcomingEnd } = argentinaDayBounds();
    const agreements = await prisma.feeAgreement.findMany({ where: { case: caseScope(req.user) },
        include: { ...financialInclude, case: { select: { id: true, clientName: true, caseNumber: true } } } });
    const pending = agreements.flatMap(agreement => present(agreement).installments
        .filter(item => item.balanceCents > 0 && item.dueDate < upcomingEnd)
        .map(item => ({ ...item, case: agreement.case, currency: agreement.currency })));
    res.json(pending.sort((a, b) => a.dueDate - b.dueDate));
});
