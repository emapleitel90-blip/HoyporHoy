// Controller: Documento — Skill 2 Redactor
import prisma from '../utils/prismaClient.js';
import { generateDocument } from '../skills/documentRedactor.js';

// POST /api/documents/generate
export const generateDocumentController = async (req, res, next) => {
    try {
        const { caseId, templateType = 'cedula' } = req.body;
        if (!caseId) return res.status(400).json({ message: 'caseId es requerido' });

        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            include: {
                assignedLawyer: { select: { name: true, email: true } },
                studio: { select: { name: true } },
            },
        });

        if (!caseData) return res.status(404).json({ message: 'Expediente no encontrado' });

        // Tenant isolation
        if (req.user.role !== 'SUPER_ADMIN' && caseData.studioId !== req.user.studioId) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        const buffer = await generateDocument(caseData, templateType);

        const sanitizedCaseNumber = caseData.caseNumber.replace(/[^a-zA-Z0-9-]/g, '_');
        const filename = `${templateType}_${sanitizedCaseNumber}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
};
