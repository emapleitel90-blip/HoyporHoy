import { api } from '../config/api';
export const duplicateInput = (data, id) => ({ dni: data.dni || '', clientName: data.clientName || '', nroExpediente: data.nroExpediente || data.numeroExpediente || '', contraparte: data.contraparte || '', ...(id ? { excludeCaseId: id } : {}) });
export const hasDuplicateCriteria = input => Object.entries(input).some(([key, value]) => key !== 'excludeCaseId' && String(value).replace(/[^\p{L}\p{N}]/gu, '').length >= (key === 'dni' ? 6 : 4));
export async function checkCaseDuplicates(input, token, signal) {
    if (!hasDuplicateCriteria(input)) return { matches: [], total: 0 };
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 15000);
    try {
        const response = await fetch(`${api.cases.duplicates}?${new URLSearchParams(input)}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data?.matches)) throw new Error(data?.message || 'No se pudieron verificar las coincidencias.');
        return data;
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
