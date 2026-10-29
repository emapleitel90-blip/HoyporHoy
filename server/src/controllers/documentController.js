// Controller: Documento — Skill 2 Redactor
import prisma from '../utils/prismaClient.js';
import { generateDocument } from '../skills/documentRedactor.js';
import { caseScope } from '../utils/caseAccess.js';

// POST /api/documents/generate
export const generateDocumentController = async (req, res, next) => {
    try {
        const { caseId, templateType = 'cedula' } = req.body;
        if (!caseId) return res.status(400).json({ message: 'caseId es requerido' });

        const caseData = await prisma.case.findFirst({
            where: { id: caseId, ...caseScope(req.user) },
            include: {
                assignedLawyer: { select: { name: true, email: true } },
                studio: { select: { name: true } },
            },
        });

        if (!caseData) return res.status(404).json({ message: 'Expediente no encontrado' });

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
