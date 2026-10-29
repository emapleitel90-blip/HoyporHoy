import { searchJurisprudencia, officialSource } from '../skills/saijSearcher.js';
import prisma from '../utils/prismaClient.js';
import { caseScope } from '../utils/caseAccess.js';

export const searchJurisprudenceController = async (req, res, next) => {
    try {
        const result = searchJurisprudencia(req.body.q, req.body.fuero);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) { next(err); }
};

export const listJurisprudence = async (req, res, next) => {
    try {
        const exp = await prisma.case.findFirst({ where: { id: req.params.caseId, ...caseScope(req.user) } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });
        const records = await prisma.timelineEvent.findMany({
            where: { caseId: exp.id, type: 'JURISPRUDENCIA' }, orderBy: { createdAt: 'desc' },
        });
        res.json(records.map(record => {
            let reference;
            try { reference = JSON.parse(record.description); } catch { /* Preserve historical text. */ }
            const source = officialSource(reference?.url);
            return reference?.version === 1 && source
                ? { id: record.id, ...reference, url: source.url, source: source.source, verification: 'USER_PROVIDED' }
                : { id: record.id, title: record.title, description: record.description, verification: 'LEGACY_UNVERIFIED' };
        }));
    } catch (err) { next(err); }
};

export const saveJurisprudenceInsight = async (req, res, next) => {
    try {
        const { caseId, insightData } = req.body;
        if (typeof caseId !== 'string' || !caseId || !insightData || typeof insightData !== 'object') {
            return res.status(400).json({ message: 'caseId e insightData son requeridos' });
        }
        const exp = await prisma.case.findFirst({ where: { id: caseId, ...caseScope(req.user) } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });
        const source = officialSource(insightData.url);
        const text = (key, max) => typeof insightData[key] === 'string' &&
            insightData[key].trim().length > 0 && insightData[key].length <= max;
        const date = insightData.fecha;
        if (!source || !text('titulo', 300) || !text('tribunal', 300) ||
            typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date ||
            (insightData.extracto !== undefined && (typeof insightData.extracto !== 'string' || insightData.extracto.length > 5000))) {
            return res.status(400).json({ message: 'Completá título, tribunal, fecha válida y enlace HTTPS de SAIJ o Justicia Córdoba. Extracto: máximo 5000 caracteres.' });
        }
        const reference = { version: 1, titulo: insightData.titulo.trim(), tribunal: insightData.tribunal.trim(),
            fecha: date, extracto: (insightData.extracto || '').trim(), ...source,
            verification: 'USER_PROVIDED', registeredBy: req.user.id, registeredAt: new Date().toISOString() };
        const record = await prisma.timelineEvent.create({ data: {
            title: 'Referencia jurisprudencial · ' + source.source, description: JSON.stringify(reference),
            type: 'JURISPRUDENCIA', eventDate: new Date(), caseId,
        } });
        res.status(201).json({ id: record.id, ...reference });
    } catch (err) { next(err); }
};
