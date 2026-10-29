// Portal links are never presented as automatically retrieved decisions.
export const officialPortals = [
    { name: 'SAIJ', url: 'https://www.saij.gob.ar/buscador/' },
    { name: 'Poder Judicial de Córdoba', url: 'https://www.justiciacordoba.gob.ar/Jurisprudencia/home' },
];

export function searchJurisprudencia(query, fuero = '') {
    if (typeof query !== 'string' || query.trim().length < 3 || query.length > 500 ||
        typeof fuero !== 'string' || fuero.length > 100) {
        return { success: false, message: 'Ingresá una consulta de 3 a 500 caracteres y un fuero válido.', results: [] };
    }
    return { success: true, mode: 'OFFICIAL_PORTALS', query: query.trim(), fuero,
        results: [], portals: officialPortals,
        message: 'Consultá los portales oficiales. La app no recupera ni verifica fallos automáticamente.' };
}

export function officialSource(raw) {
    if (typeof raw !== 'string' || raw.length > 2000 || /[\\\s]/u.test(raw)) return null;
    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
        const hosts = new Map([
            ['saij.gob.ar', 'SAIJ'], ['www.saij.gob.ar', 'SAIJ'],
            ['justiciacordoba.gob.ar', 'Poder Judicial de Córdoba'],
            ['www.justiciacordoba.gob.ar', 'Poder Judicial de Córdoba'],
        ]);
        const source = hosts.get(url.hostname);
        return source ? { url: url.href, source } : null;
    } catch { return null; }
}

