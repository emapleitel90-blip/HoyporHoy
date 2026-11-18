import { AppError } from '../middleware/errorMiddleware.js';
import { validateCasePriority } from './casePriority.js';

const statuses = new Set(['OPEN', 'CLOSED', 'PENDING', 'IN_REVIEW', 'REJECTED']);

function readDetails(value) {
    if (value === undefined || value === null) return value;
    let parsed = value;
    if (typeof value === 'string') {
        try { parsed = JSON.parse(value); } catch { parsed = null; }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new AppError('Los datos de admisión deben ser un objeto válido.', 400);
    }
    return typeof value === 'string' ? value : JSON.stringify(value);
}

export function readCaseUpdate(body) {
    const { title, clientName, details, description, status, assignedLawyerId, fuero, score, version } = body;
    if (!Number.isInteger(version) || version < 0 || version >= 2147483647) {
        throw new AppError('Volvé a abrir el expediente para obtener su versión actual antes de guardar.', 400);
    }
    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
        throw new AppError('Ingresá un asunto válido.', 400);
    }
    for (const [value, label] of [[clientName, 'cliente'], [description, 'descripción'], [fuero, 'fuero'], [assignedLawyerId, 'responsable']]) {
        if (value !== undefined && value !== null && typeof value !== 'string') {
            throw new AppError(`Revisá el campo ${label}.`, 400);
        }
    }
    if (status !== undefined && !statuses.has(status)) throw new AppError('Elegí un estado válido para el expediente.', 400);
    const parsedScore = typeof score === 'string' && score.trim() ? Number(score) : score;
    if (parsedScore != null && (!Number.isInteger(parsedScore) || parsedScore < -2147483648 || parsedScore > 2147483647)) {
        throw new AppError('El puntaje debe ser un número entero válido.', 400);
    }
    return {
        version,
        data: { title, clientName, description, status, fuero: fuero || undefined, score: parsedScore,
            details: readDetails(details), assignedLawyerId: assignedLawyerId === '' ? null : assignedLawyerId,
            priority: validateCasePriority(body.priority) },
    };
}
