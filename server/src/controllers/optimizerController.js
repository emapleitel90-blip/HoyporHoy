import { runFileOptimizer } from '../skills/fileOptimizer.js';

export const triggerFileOptimizer = async (req, res) => {
    try {
        const report = await runFileOptimizer();
        res.status(200).json({
            success: true,
            message: 'Optimización completada y reporte generado.',
            report
        });
    } catch (error) {
        console.error('Error in File Optimizer:', error);
        res.status(500).json({ success: false, message: 'Fallo al ejecutar la habilidad optimizadora' });
    }
};
