import { describe, it, expect } from 'vitest';
import { generateDocument } from '../skills/documentRedactor.js';

describe('Document Redactor Skill', () => {
    it('Debe generar un Buffer de archivo .docx dada la data del expediente', async () => {
        const mockCaseData = {
            caseNumber: 'CAS-12345',
            title: 'Mock Case Title',
            fuero: 'Laboral',
            assignedLawyer: { name: 'Dr. Test' }
        };

        const buffer = await generateDocument(mockCaseData, 'cedula');
        expect(buffer).toBeDefined();
        // El magic number típico de los zip/docx (PK)
        expect(buffer.toString('hex', 0, 4)).toBe('504b0304');
    });

    it('Debe usar el template por defecto (cedula) si se provee un tipo inválido', async () => {
        const mockCaseData = { caseNumber: 'CAS-1' };
        const buffer = await generateDocument(mockCaseData, 'invalido');
        expect(buffer).toBeDefined();
    });
});
