import OpenAI from 'openai';

/**
 * Skill 5: Asistente Legal con IA para Búsqueda de Jurisprudencia
 * Se integra con OpenAI (o un modelo compatible como Azure OpenAI) 
 * proporcionado por el usuario para generar sugerencias jurisprudenciales.
 */

export async function searchJurisprudencia(query, fuero = '', apiKey = '') {
    if (!query || query.trim().length < 3) {
        return { success: false, message: 'La búsqueda requiere al menos 3 caracteres.', results: [] };
    }

    if (!apiKey) {
        return { success: false, message: 'Se requiere una API Key de OpenAI para usar este buscador premium.', results: [] };
    }

    try {
        const openai = new OpenAI({ apiKey });

        const systemPrompt = `Sos un experto abogado e investigador de jurisprudencia en Argentina (Especialista en el fuero ${fuero || 'General'}).
Tu objetivo es ayudar a otro abogado a encontrar jurisprudencia y doctrina relevante para su caso.
El usuario te dará un tema, contexto o términos de búsqueda.
Debes devolver una respuesta estructurada en formato Markdown que contenga:
1. **Estrategia de búsqueda**: Sugerencias de términos clave precisos para buscar en el SAIJ (Sistema Argentino de Información Jurídica) o sistemas de tribunales.
2. **Fallos Plenarios / Leading Cases**: Menciona 2 o 3 fallos famosos o doctrina de la Corte Suprema o Tribunales Superiores relevantes a este tema. Incluye el título del fallo y un breve resumen de lo que resolvió.
3. **Análisis Legal**: Una brevísima conclusión sobre la tendencia de la jurisprudencia en este tema.

Formatea tu respuesta de manera profesional, clara y concisa (máximo 400 palabras).`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // o gpt-3.5-turbo dependiendo de la cuenta
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Consulta de Jurisprudencia: ${query}` }
            ],
            temperature: 0.2,
            max_tokens: 800,
        });

        const aiResponse = completion.choices[0].message.content;

        // Estructuramos el resultado para el Frontend
        const results = [{
            titulo: 'Análisis Estratégico de Jurisprudencia (Generado por IA)',
            url: 'https://www.saij.gob.ar/buscador/jurisprudencia-nacional',
            tribunal: `IA Legal - Fuero ${fuero || 'General'}`,
            fecha: new Date().toLocaleDateString('es-AR'),
            resumen_ai: aiResponse
        }];

        return {
            success: true,
            query,
            fuero: fuero || 'Todos los fueros',
            results,
        };
    } catch (err) {
        console.error('[SaijSearcher AI]', err.message);
        
        // Manejar errores de autenticación comunes
        if (err.status === 401) {
            return { success: false, message: 'API Key inválida o sin saldo. Verificá tus credenciales de OpenAI / Copilot.', results: [] };
        }
        
        return { success: false, message: 'Error al consultar la IA Legal. Verificá tu conexión o intentá más tarde.', results: [] };
    }
}

