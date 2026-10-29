import Papa from 'papaparse';

const readFile = (file, asText) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo. Volvé a seleccionarlo.'));
    if (asText) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
});

export const readImportRows = async file => {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(extension)) {
        throw new Error('Formato no soportado. Subí un archivo CSV, XLS o XLSX.');
    }
    const content = await readFile(file, extension === 'csv');
    let rows;
    if (extension === 'csv') {
        const parsed = Papa.parse(content, { header: true, skipEmptyLines: 'greedy' });
        if (parsed.errors.some(error => error.type !== 'Delimiter')) {
            throw new Error('No se pudo leer el CSV. Revisá los encabezados, las comillas y las columnas.');
        }
        rows = parsed.data;
    } else {
        try {
            const { read, utils } = await import('xlsx');
            const workbook = read(content, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = sheet ? utils.sheet_to_json(sheet, { raw: false }) : [];
        } catch {
            throw new Error('No se pudo leer el Excel. Verificá que no esté dañado ni protegido.');
        }
    }
    if (!rows.length) throw new Error('El archivo no contiene filas para importar.');
    return rows;
};
