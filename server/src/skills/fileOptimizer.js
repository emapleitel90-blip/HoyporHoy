import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_FILES = ['.ds_store', 'npm-debug.log', 'yarn-error.log', 'thumbs.db'];
const TARGET_DIRS = ['temp', 'tmp', '.cache'];

function getFolderSize(folderPath) {
    let size = 0;
    try {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getFolderSize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        // Ignorar
    }
    return size;
}

function cleanDirectory(dir, report) {
    try {
        const items = fs.readdirSync(dir);

        for (const item of items) {
            const itemPath = path.join(dir, item);
            let stats;
            try {
                stats = fs.statSync(itemPath);
            } catch (e) {
                continue;
            }

            if (stats.isDirectory()) {
                // Evitamos meternos en node_modules y .git para mayor velocidad
                if (item === 'node_modules' || item === '.git' || item === '.husky') {
                    continue;
                }

                if (TARGET_DIRS.includes(item.toLowerCase())) {
                    const size = getFolderSize(itemPath);
                    fs.rmSync(itemPath, { recursive: true, force: true });
                    report.archivosBorrados.push(itemPath);
                    report.espacioLiberadoMB += size / (1024 * 1024);
                } else {
                    cleanDirectory(itemPath, report);
                }
            } else {
                if (TARGET_FILES.includes(item.toLowerCase())) {
                    const size = stats.size;
                    fs.unlinkSync(itemPath);
                    report.archivosBorrados.push(itemPath);
                    report.espacioLiberadoMB += size / (1024 * 1024);
                } else if (item.toLowerCase().endsWith('.log') && item.toLowerCase() !== 'server.log') {
                    const size = stats.size;
                    fs.unlinkSync(itemPath);
                    report.archivosBorrados.push(itemPath);
                    report.espacioLiberadoMB += size / (1024 * 1024);
                } else if (item.startsWith('.env') && item !== '.env' && item !== '.env.example') {
                    report.incongruenciasDetectadas.push(`Archivo de ambiente suelto detectado: ${itemPath}. Puede causar problemas (Ej. Prisma) cruzando variables de entorno en el Tester.`);
                }
            }
        }
        
    } catch (e) {
        // Fail silently unreadable properties
    }
}

async function runFileOptimizer() {
    // La raíz del proyecto (lyp-app)
    const projectRoot = path.resolve(__dirname, '../../../'); 

    const report = {
        timestamp: new Date().toISOString(),
        espacioLiberadoMB: 0,
        archivosBorrados: [],
        incongruenciasDetectadas: []
    };

    cleanDirectory(projectRoot, report);
    report.espacioLiberadoMB = parseFloat(report.espacioLiberadoMB.toFixed(2));

    const reportPath = path.join(projectRoot, 'cleanup_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
}

export { runFileOptimizer };
