# ArgusLegal: referencia de producto y próximos pasos de HoyporHoy

Fecha de consulta: 16/10/2026.

Dirección de producto posterior a esta investigación: [hoja de ruta de HoyporHoy](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/HOJA_DE_RUTA_PRODUCTO.md>). Incluye la meta de superar la referencia en utilidad y los criterios de aceptación por entrega.

## Alcance y conclusión

Investigación de páginas oficiales, centro de ayuda y manual público de ArgusLegal. No se accedió a una cuenta privada ni se probó su motor de IA. Las funciones indicadas son las que el proveedor describe; sus promesas de precisión, cobertura, actualización y ahorro de tiempo no fueron verificadas de manera independiente.

La recomendación para HoyporHoy es completar primero el seguimiento operativo acordado: compromisos del cliente, documentación faltante y motivos de bloqueo. Luego, cobranzas y recordatorios por WhatsApp. La referencia de Argus aporta una evolución posterior: documentos con contexto, fuentes, versiones y revisión vinculada a la tarea.

## Hoja de ruta recuperada de los chats

En «Buscar proyectos similares» se acordó esta secuencia:

1. Trabajo del estudio: expedientes, tareas, entrega y revisión del titular.
2. Seguimiento del cliente: compromisos, documentación faltante y motivos de bloqueo.
3. Cobranzas: honorarios, cuotas, pagos y recordatorios por WhatsApp.
4. Mi Jornada: reunir pendientes, revisiones, vencimientos y seguimientos.
5. Mejoras posteriores: expedientes sin movimiento, rutinas reutilizables y cierre ordenado.

La regla del producto es que cada expediente permita reconocer el próximo paso, su responsable y su fecha. Este documento ajusta la recomendación anterior, que se había formulado principalmente a partir de pendientes técnicos locales.

## Qué describe Argus y qué podemos aprender

| Área | Información extraída de la documentación pública | Aplicación propuesta en HoyporHoy |
|---|---|---|
| Análisis del caso | Permite aportar documentos, conversar con un asistente y definir jurisdicción, fuero y posición procesal. Los fallos seleccionados se incorporan como fuentes del análisis. | Mantener contexto estructurado por expediente y distinguir información confirmada de información faltante. |
| Preparación de escritos | El recorrido documentado pasa por documentación, análisis, respuestas del abogado, generación y edición. | Usar etapas visibles para que el junior y el titular sepan qué falta antes de revisar un escrito. |
| Plantillas propias | Su guía permite definir nuevos tipos de escrito, indicar parámetros y responder preguntas antes de confirmar un modelo reutilizable. | Separar la plantilla del estudio del documento concreto de cada expediente. |
| Versiones y revisión | La guía pública incluye edición asistida, comparación de versiones y descarga final. | Asociar la entrega de una tarea a una versión específica, conservando las correcciones y la aprobación. |
| Jurisprudencia | El proveedor describe búsqueda contextual, validación con otro modelo y enlaces a fallos oficiales de SAIJ, CSJN y JUBA. | Guardar cada fuente identificable, su enlace y el fragmento usado; separar verificación de existencia y evaluación de pertinencia. |
| Conexiones judiciales | Connect anuncia integración con PJN, MEV/SCBA, SRT, SAC Córdoba y SIGJ Jujuy. | Evaluar una jurisdicción inicial después del MVP operativo y comprobar sus mecanismos de acceso e integración. |
| Agenda vinculada | Connect describe extracción de citas desde novedades, agrupación de duplicados, suspensión y conservación de cambios manuales. | Vincular cada evento a su documento de origen y proponer fechas para confirmación antes de incorporarlas a la agenda. |

Fuentes para las filas anteriores:

- Análisis y contexto: [Argus Análisis](https://www.arguslegal.ai/analisis).
- Etapas de preparación: [manual público, septiembre de 2025](https://app.arguslegal.ai/Argus%20Instructivo-comprimido.pdf). Es una referencia de flujo; puede no reflejar la interfaz actual.
- Plantillas: [guía para crear tipos de escrito](https://ayuda.arguslegal.ai/general/nuevo-tipo-de-escrito-modelo-de-escrito/2-como-crear-un-nuevo-tipo-de-escrito-con-ia-en-argus).
- Versiones: [guía y tutoriales oficiales](https://www.arguslegal.ai/guia).
- Fuentes jurídicas: [Argus Jurisprudencia](https://www.arguslegal.ai/jurisprudencia).
- Portales y agenda: [Argus Connect](https://www.arguslegal.ai/connect).

El índice de [miniguías](https://ayuda.arguslegal.ai/general/mini-guias) también describe detección de contradicciones y vacíos de información, y clasificación de jurisprudencia. Dos artículos individuales no pudieron recuperarse; por eso no se atribuyen procedimientos detallados a esas páginas.

La página de [planes](https://www.arguslegal.ai/) presenta paquetes por escritos, expedientes importados, análisis, integrantes y conectores. No se confirmó un importe público de contratación. Este análisis no propone precios para HoyporHoy.

## Estado real de HoyporHoy frente a esa referencia

| Capacidad | Estado observado en el código local |
|---|---|
| Tareas y revisión | Ya existe el circuito con responsable, revisor, estados e historial. |
| Entrega de un documento | La entrega de tarea registra observaciones. Todavía no referencia un archivo ni una versión determinada de un escrito. |
| Archivos del expediente | Al relevar el proyecto el 16/10 se registraban URLs simuladas. En la continuación del 19/10 se completó la carga real y la descarga privada; ver [entrega de archivos](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ENTREGA_ARCHIVOS_PARA_REVISION.md>). La extracción de texto y el análisis siguen pendientes. |
| Generación de documentos | Hay plantillas programadas de cédula, oficio y escrito simple que generan Word. Falta un espacio de edición y versiones persistentes. |
| Asistencia jurisprudencial | El código pide orientaciones a un modelo y devuelve un enlace al buscador general de SAIJ. No recupera ni verifica individualmente los fallos mencionados. |
| Gestión económica | Existe un módulo de gastos. Un gasto del expediente no equivale a una cuenta de honorarios por cobrar con cuotas, pagos y saldo. |

Evidencia local: [esquema](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/prisma/schema.prisma>), [tareas](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/controllers/taskController.js>), [generación de Word](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/skills/documentRedactor.js>), [asistencia jurisprudencial](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/server/src/skills/saijSearcher.js>).

## Próxima entrega recomendada: seguimiento del cliente y documentos pendientes

Un alcance concreto, aprovechando expedientes, archivos, tareas y Mi Jornada existentes:

- Registrar lo solicitado al cliente: documento o compromiso, fecha acordada y persona del estudio que hará seguimiento.
- Checklist por expediente: pendiente, recibido, requiere corrección y verificado.
- Vincular un archivo ya cargado con el requisito que satisface; adjuntar un archivo no debe marcarlo automáticamente como verificado.
- Registrar un motivo de bloqueo, quién puede resolverlo y la próxima acción, sin confundirlo con el estado procesal del expediente.
- Mostrar compromisos vencidos y documentación pendiente en Mi Jornada.
- Preparar mensajes de seguimiento por WhatsApp con los datos necesarios para que el usuario los revise y envíe. El primer alcance no requiere envío automático.
- Conservar quién registró cada cambio y evitar que otro estudio o titular independiente pueda consultar o modificarlo.

Ejemplo de aceptación: se solicita un recibo para el viernes, se asigna el seguimiento a un operador y aparece en su jornada. Cuando llega el archivo, queda recibido; el abogado lo verifica o pide una corrección. El expediente muestra qué sigue y quién debe actuar.

## Orden posterior propuesto

1. **Cobranzas:** honorarios, cuotas, pagos, saldo y preparación de recordatorios; registrar un pago debe retirar el aviso pendiente correspondiente.
2. **Documentos vinculados a tareas:** biblioteca de modelos, edición, versiones y aprobación de una entrega concreta.
3. **Análisis documental asistido:** extracción de texto, referencias a páginas de origen y sugerencias de datos faltantes o tareas, confirmadas por el abogado.
4. **Jurisprudencia con fuentes recuperadas:** identidad del fallo, tribunal, fecha, enlace, texto pertinente y revisión profesional. Un enlace general al buscador no basta para rotular una cita como verificada.
5. **Conexiones judiciales y agenda asistida:** piloto de un portal, con trazabilidad, control de duplicados y conservación de ediciones manuales.

Estos son próximos alcances propuestos, no funcionalidades ya implementadas ni compromisos de integración con Argus.

## Prerrequisitos técnicos

- Resolver el historial de migraciones pendiente descrito en [ESTADO_TAREAS.md](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ESTADO_TAREAS.md>) antes de actualizar la base habitual.
- Extender a documentos y guardado de jurisprudencia el aislamiento por titular independiente usado en tareas. Actualmente esos controladores comparan `studioId`; cuando ambos valores son nulos, esa comparación no identifica al dueño del expediente.
- La investigación de Argus no modificó código funcional, no realizó llamadas de IA con datos del estudio y no envió mensajes por WhatsApp.
