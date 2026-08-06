/**
 * Utility to handle legal document uploads.
 * Currently uses a mock implementation for development/demo purposes.
 */

export const uploadLegalDocument = async (file, studioId, caseId, onProgress) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        console.log(`[MockUpload] Subiendo ${file.name} para el estudio ${studioId} y caso ${caseId}`);
        
        // Simular progreso de carga
        let progress = 0;
        const interval = setInterval(() => {
            progress += 20;
            if (onProgress) onProgress(progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                // Devolver URL simulada estable
                const mockUrl = `https://storage.lyp.com/studios/${studioId}/cases/${caseId}/${Date.now()}_${encodeURIComponent(file.name)}`;
                resolve(mockUrl);
            }
        }, 200);
    });
};
