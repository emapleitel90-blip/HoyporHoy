import { AppError } from '../middleware/errorMiddleware.js';

const priorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const urgentOpenCase = { priority: 'URGENT', status: 'OPEN' };
const legacyPriorities = new Map([
    ['baja', 'LOW'], ['low', 'LOW'],
    ['media', 'MEDIUM'], ['medio', 'MEDIUM'], ['medium', 'MEDIUM'],
    ['alta', 'HIGH'], ['high', 'HIGH'],
    ['urgente', 'URGENT'], ['urgente (plazos corriendo)', 'URGENT'], ['urgent', 'URGENT'],
]);

export function validateCasePriority(value) {
    if (value !== undefined && !priorities.has(value)) {
        throw new AppError('Elegí una prioridad válida para el expediente.', 400);
    }
    return value;
}

export function legacyCasePriority(details) {
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { return undefined; }
    }
    for (const field of ['nivelUrgencia', 'urgencia']) {
        const value = details?.[field];
        const priority = typeof value === 'string' && legacyPriorities.get(value.trim().toLowerCase());
        if (priority) return priority;
    }
    return undefined;
}
