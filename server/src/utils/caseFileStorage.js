import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { open, unlink } from 'node:fs/promises';
import { AppError } from '../middleware/errorMiddleware.js';

// This directory is deliberately separate from the public /uploads directory.
export const caseFilesDirectory = () => path.resolve(process.env.CASE_FILES_DIR ||
    fileURLToPath(new URL('../../storage/case-files/', import.meta.url)));
export const MAX_CASE_FILE_SIZE = 20 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mimeTypes = {
    '.pdf': ['application/pdf'],
    '.doc': ['application/msword'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    '.xls': ['application/vnd.ms-excel'],
    '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.webp': ['image/webp'],
};

export const caseFileUrl = (id) => `/api/cases/files/${id}/download`;
export const isPrivateCaseFile = (file) => uuid.test(file.id) && file.url === caseFileUrl(file.id);
export const caseFilePath = (id) => {
    if (!uuid.test(id)) throw new AppError('Archivo no disponible', 404);
    return path.join(caseFilesDirectory(), id);
};
export const fileMime = (name) => mimeTypes[path.extname(name).toLowerCase()]?.[0];

export const originalFileName = (name) => {
    // Browser multipart filenames arrive as UTF-8 bytes decoded as Latin-1 by Busboy.
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    const value = decoded.includes('\uFFFD') ? name : decoded;
    return value.replaceAll('\\', '/').split('/').pop().normalize('NFC')
        .replace(/[\x00-\x1f\x7f]/g, '').trim();
};

export const acceptsCaseFile = (file) => {
    const name = originalFileName(file.originalname);
    const allowed = mimeTypes[path.extname(name).toLowerCase()];
    if (!name || name.length > 200 || !allowed ||
        ![...allowed, 'application/octet-stream'].includes(file.mimetype)) {
        throw new AppError('Formato no admitido. Usá PDF, Word, Excel o imágenes PNG, JPG o WebP.', 415);
    }
};

export const validateCaseFileContent = async (file) => {
    if (!file.size) throw new AppError('El archivo está vacío', 400);
    const handle = await open(file.path, 'r');
    const bytes = Buffer.alloc(12);
    let length;
    try { ({ bytesRead: length } = await handle.read(bytes, 0, 12, 0)); }
    finally { await handle.close(); }
    const ext = path.extname(originalFileName(file.originalname)).toLowerCase();
    const startsWith = (signature) => length >= signature.length && bytes.subarray(0, signature.length).equals(signature);
    const signatures = {
        '.pdf': () => startsWith(Buffer.from('%PDF-')),
        '.png': () => startsWith(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        '.jpg': () => startsWith(Buffer.from([255, 216, 255])),
        '.jpeg': () => startsWith(Buffer.from([255, 216, 255])),
        '.webp': () => length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
        '.doc': () => startsWith(Buffer.from('d0cf11e0a1b11ae1', 'hex')),
        '.xls': () => startsWith(Buffer.from('d0cf11e0a1b11ae1', 'hex')),
        '.docx': () => startsWith(Buffer.from('504b0304', 'hex')),
        '.xlsx': () => startsWith(Buffer.from('504b0304', 'hex')),
    };
    if (!signatures[ext]?.()) throw new AppError('El contenido no coincide con el formato del archivo', 415);
};

export const removeStoredCaseFile = async (id) => {
    try { await unlink(caseFilePath(id)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
};
