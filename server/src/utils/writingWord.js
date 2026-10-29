import { Document, Packer, Paragraph, TextRun, Tab, Footer, PageNumber, AlignmentType } from 'docx';

// Export only the selected immutable snapshot; no live case fields or template text.
export const writingWord = version => Packer.toBuffer(new Document({
    creator: version.createdByName.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uD800-\uDFFF\uFFFE\uFFFF]/gu, '') || 'Usuario',
    title: version.title,
    description: `Versión ${version.number}`,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24, color: '000000' },
        paragraph: { spacing: { after: 0, line: 360 } } } } },
    sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Versión ${version.number} · Página `, size: 18 }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
        children: [new Paragraph({ spacing: { after: 240 }, keepNext: true,
            children: [new TextRun({ text: version.title, bold: true, size: 28 })] }),
        ...version.content.split('\n').map(line => new Paragraph({ children: [new TextRun({
            children: line.split('\t').flatMap((text, index) => index ? [new Tab(), text] : [text]),
        })] }))],
    }],
}));
