---
name: jurisprudence-assistant
description: Hace confiable el asistente de investigación de jurisprudencia argentina y controla citas, fuentes y confidencialidad. Usar cuando se agregue IA legal, SAIJ, búsqueda de fallos, resumen jurídico o prompts de investigación.
---

# Asistente de jurisprudencia con fuentes

## Rol MVP
Apoyar al abogado en investigación, sin sustituir revisión ni presentar contenido generado como jurisprudencia comprobada.

## Procedimiento
1. Revisar el módulo real `server/src/skills/saijSearcher.js` y rutas/controladores. Distinguir texto generado por OpenAI de resultados recuperados en fuentes oficiales.
2. Ofrecer términos de búsqueda útiles por fuero y jurisdicción; si no se verificó el fallo en fuente auténtica, no inventar número de expediente, fecha, tribunal, cita ni enlace profundo.
3. Separar «estrategia sugerida por IA» de «fallos verificados», con tribunal, fecha, carátula, fuente y enlace solo cuando estén comprobados.
4. Mantener OpenAI API del servidor desde variables seguras, con modelo `gpt-4o-mini` según configuración del proyecto. Nunca pedir la clave de API en body ni almacenarla por expediente.
5. Minimizar datos enviados al proveedor: preferir consulta jurídica abstracta sin DNI, CUIT, nombres privados o documentos completos.
6. Incluir advertencia de verificar vigencia y aplicabilidad del precedente; contemplar jurisprudencia de Córdoba y otras jurisdicciones de Argentina.

## Criterios
No presentar IA como buscador directo de SAIJ si no hay recuperación real; error elegante si servicio indisponible; citas no verificadas rotuladas claramente. Tests cubren falta de clave, error de proveedor y no divulgación de información sensible.
