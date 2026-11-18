import { describe, expect, it } from 'vitest';
import { organizeAdmissionSections } from '../utils/caseAdmissionSections';

describe('Organización de admisión con configuraciones anteriores', () => {
    it('adapta IDs numéricos conservando la clave de los documentos y de los ítems personalizados', () => {
        const result = organizeAdmissionSections([
            { id: '1', title: 'Datos del Consultante', enabled: true, fields: [] },
            { id: '6', title: 'Documentación', enabled: true, type: 'checklist', items: ['DNI'] },
            { id: '12', title: 'Línea de Tiempo', enabled: true, type: 'timeline' },
            { id: '11', title: 'FODA', enabled: true },
        ]);
        expect(result.map(section => section.id)).toEqual(['datos-consultante', 'timeline', 'documentacion']);
        expect(result[2].storageId).toBe('6');
        expect(organizeAdmissionSections(result)).toEqual(result);
    });
    it('reordena, integra expectativas personalizadas y conserva los campos del estudio sin mutar la configuración', () => {
        const sections = [
            { id: 'datos-consultante', title: '1. Datos', enabled: true, fields: [{ name: 'dni', type: 'text' }] },
            { id: 'personalizado', title: '2. Especial', enabled: true },
            { id: 'expectativas', title: '9. Expectativas', enabled: true, fields: [{ name: 'plazoEsperado', label: 'Plazo', type: 'text' }] },
            { id: 'foda', title: '11. FODA', enabled: true },
            { id: 'evaluacion-lyp', title: '10. Evaluación', enabled: true },
            { id: 'analisis-psicologico', title: '8. Análisis', enabled: true },
            { id: 'timeline', title: '12. Línea de tiempo', type: 'timeline', enabled: true },
        ];
        const original = JSON.stringify(sections);
        const result = organizeAdmissionSections(sections);
        expect(result.map(section => section.id)).toEqual(['datos-consultante', 'timeline', 'analisis-psicologico', 'personalizado']);
        expect(result[1].title).toBe('2. Línea de tiempo');
        expect(result[0].fields).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'poderFirmado', options: ['Sin registrar', 'Pendiente', 'Sí', 'No'] }),
            expect.objectContaining({ name: 'plazoEsperado', group: 'expectativas' }),
            expect.objectContaining({ name: 'dni' }),
        ]));
        expect(result[1].fields).toHaveLength(10);
        expect(JSON.stringify(sections)).toBe(original);
        expect(organizeAdmissionSections(result)).toEqual(result);
    });
});
