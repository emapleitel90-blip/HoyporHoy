// Controller: Jurisprudencia — Skill 5 SAIJ Searcher
import { searchJurisprudencia } from '../skills/saijSearcher.js';
import prisma from '../utils/prismaClient.js';

// POST /api/jurisprudencia/search
export const searchJurisprudenceController = async (req, res, next) => {
    try {
        const { q, fuero, apiKey } = req.body;
        if (!q) return res.status(400).json({ message: 'El parámetro de búsqueda (q) es requerido' });

        const results = await searchJurisprudencia(q, fuero, apiKey);
        res.json(results);
    } catch (err) {
        next(err);
    }
};

// POST /api/jurisprudencia/save
// Guarda un fallo seleccionado en el Timeline del expediente (Insight AI)
export const saveJurisprudenceInsight = async (req, res, next) => {
    try {
        const { caseId, insightData } = req.body;
        if (!caseId || !insightData) {
            return res.status(400).json({ message: 'caseId e insightData son requeridos' });
        }

        const exp = await prisma.case.findUnique({ where: { id: caseId } });
        if (!exp) return res.status(404).json({ message: 'Expediente no encontrado' });

        if (req.user.role !== 'SUPER_ADMIN' && exp.studioId !== req.user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const formattedDesc = `Título: ${insightData.titulo}\nTribunal: ${insightData.tribunal}\nFecha: ${insightData.fecha}\nEnlace: ${insightData.url}`;

        const timelineEvent = await prisma.timelineEvent.create({
            data: {
                title: '📌 Jurisprudencia de Interés (SAIJ)',
                description: formattedDesc,
                type: 'JURISPRUDENCIA',
                eventDate: new Date(),
                caseId: caseId,
            },
        });

        res.status(201).json(timelineEvent);
    } catch (err) {
        next(err);
    }
};
