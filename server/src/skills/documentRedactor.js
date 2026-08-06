/**
 * Skill 2: Redactor de Documentos Legales
 * Genera documentos .docx desde plantillas con datos del expediente.
 * Usa la librería 'docx' para construir el documento en memoria.
 */
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    Header,
} from 'docx';

/**
 * Genera un archivo .docx y devuelve un Buffer listo para enviar como descarga.
 * @param {Object} caseData - Datos del expediente (objeto Prisma Case con relaciones)
 * @param {'cedula'|'oficio'|'escrito'} templateType - Tipo de documento a generar
 * @returns {Buffer} - Contenido del archivo .docx
 */
export async function generateDocument(caseData, templateType = 'cedula') {
    const templates = {
        cedula: buildCedula,
        oficio: buildOficio,
        escrito: buildEscritoSimple,
    };

    const builder = templates[templateType] || buildCedula;
    const doc = builder(caseData);

    return await Packer.toBuffer(doc);
}

// ─ Template: Cédula de Notificación ─────────────────────────────────────────
function buildCedula(caseData) {
    const today = new Date().toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    return new Document({
        sections: [{
            headers: {
                default: new Header({
                    children: [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: 'PODER JUDICIAL — CÓRDOBA', bold: true, size: 20 })],
                        }),
                    ],
                }),
            },
            children: [
                // Título
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'CÉDULA DE NOTIFICACIÓN', bold: true, size: 28 })],
                }),
                new Paragraph({ children: [new TextRun('')] }),

                // Datos del expediente
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Expediente N°: ', bold: true }),
                        new TextRun({ text: caseData.caseNumber || '—' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Autos: ', bold: true }),
                        new TextRun({ text: caseData.title || '—' }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Fuero: ', bold: true }),
                        new TextRun({ text: caseData.fuero || '—' }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),

                // Cuerpo
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `En la ciudad de Córdoba, a los ${today}, se notifica a quien corresponda lo siguiente:`,
                        }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: caseData.description || '[Completar descripción de la notificación]',
                            italics: true,
                        }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({ children: [new TextRun('')] }),

                // Firma
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '____________________________', bold: true })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: caseData.assignedLawyer?.name || 'Abogado/a Patrocinante' })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Generado automáticamente el ${today} — CRM LyP` })],
                }),
            ],
        }],
    });
}

// ─ Template: Oficio ──────────────────────────────────────────────────────────
function buildOficio(caseData) {
    const today = new Date().toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    return new Document({
        sections: [{
            children: [
                new Paragraph({
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'OFICIO JUDICIAL', bold: true, size: 28 })],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [new TextRun({ text: `Córdoba, ${today}` })],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'SEÑOR/A JUEZ/A DE TURNO\nS/D\n\n', bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: `El que suscribe, en los autos caratulados "${caseData.title}" (Exp. N° ${caseData.caseNumber}), a V.S. respetuosamente dice:`,
                        }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: caseData.description || '[Completar el objeto del oficio]',
                            italics: true,
                        }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [new TextRun({ text: 'Es Justicia.\n', bold: true })],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '____________________________' })],
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: caseData.assignedLawyer?.name || 'Abogado/a Patrocinante' })],
                }),
            ],
        }],
    });
}

// ─ Template: Escrito Simple ──────────────────────────────────────────────────
function buildEscritoSimple(caseData) {
    const today = new Date().toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    return new Document({
        sections: [{
            children: [
                new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: `Córdoba, ${today}` })],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'REF: ', bold: true }),
                        new TextRun({ text: `${caseData.title} — Exp. N° ${caseData.caseNumber}` }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [new TextRun({ text: 'SEÑOR/A JUEZ/A:\n', bold: true })],
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: caseData.description || '[Completar el cuerpo del escrito]',
                        }),
                    ],
                }),
                new Paragraph({ children: [new TextRun('')] }),
                new Paragraph({
                    children: [new TextRun({ text: 'Proveer de Conformidad,\nES JUSTICIA.', bold: true })],
                }),
            ],
        }],
    });
}
