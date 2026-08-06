import { describe, it, expect } from 'vitest';
import { runFileOptimizer } from '../skills/fileOptimizer.js';
import fs from 'fs';
import path from 'path';

describe('skill_optimizador_archivos', () => {
    it('Debe devolver un reporte válido al ejecutar la limpieza básica', async () => {
        const report = await runFileOptimizer();
        expect(report).toBeDefined();
        expect(report.timestamp).toBeDefined();
        expect(typeof report.espacioLiberadoMB).toBe('number');
        expect(Array.isArray(report.archivosBorrados)).toBe(true);
        expect(Array.isArray(report.incongruenciasDetectadas)).toBe(true);
    });

    it('El reporte es clave para que el analista-tester sepa si hubo contaminación ambiental', async () => {
        // En lugar de mockear, creamos un archivo real en la raíz del backend (o lyp-app)
        const projectRoot = path.resolve(__dirname, '../../../');
        const testEnvPath = path.join(projectRoot, '.env.tester.incongruente');
        
        // Escribimos el archivo incongruente
        fs.writeFileSync(testEnvPath, 'TEST=1');

        try {
            const report = await runFileOptimizer();
            expect(report.incongruenciasDetectadas.length).toBeGreaterThan(0);
            
            // Verificamos que reportó el archivo
            const detectoElArchivo = report.incongruenciasDetectadas.some(msg => msg.includes('.env.tester.incongruente'));
            expect(detectoElArchivo).toBe(true);
        } finally {
            // Limpiamos siempre
            if (fs.existsSync(testEnvPath)) {
                fs.unlinkSync(testEnvPath);
            }
        }
    });
});
