# HoyporHoy: dirección de producto y entregas

Actualizado: 29/10/2026.

## Dirección acordada

El usuario quiere que HoyporHoy tome a ArgusLegal como referencia y lo supere en utilidad para el estudio. Es una meta de producto, no una afirmación de superioridad actual.

La propuesta es conectar el ciclo completo: expediente → documentación → trabajo del equipo → escrito → revisión → seguimiento del cliente → cobro. Cada expediente debe mostrar qué sigue, quién está a cargo, para cuándo y qué impide avanzar.

Se mantienen las prioridades recuperadas de «Buscar proyectos similares»: seguimiento del cliente y documentación después del circuito de tareas, luego cobranzas y recordatorios por WhatsApp. El análisis de Argus amplía esa dirección con análisis documental, fuentes jurídicas y versiones de escritos. La [investigación previa](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/REFERENCIA_ARGUSLEGAL_Y_ROADMAP.md>) contiene las fuentes públicas y sus límites.

## Roles y forma de trabajo

El recordatorio del usuario y lo conversado en «Fusionar con HoyporHoy» mantienen este reparto: nosotros avanzamos en funcionalidad y Bartolito revisa la seguridad y el código.

| Participante | Responsabilidad en HoyporHoy |
|---|---|
| Ema | Define la visión y las prioridades del producto, aporta el funcionamiento real del estudio y valida si cada entrega resuelve la necesidad prevista. |
| Ema y el asistente | Convierten las necesidades en flujos, requisitos, alcance por entrega y criterios de aceptación; mantienen la hoja de ruta y estudian referencias como Argus. |
| Asistente en Codex | Implementa los cambios autorizados sobre la carpeta activa, conserva el trabajo existente, realiza comprobaciones funcionales y prepara evidencia y documentación para revisión. |
| Bartolito | Realiza la revisión técnica de seguridad y código; sus observaciones se registran, se corrigen y se vuelven a comprobar sobre una versión identificable. |
| Abogado responsable, como usuario de la aplicación | Revisa el contenido jurídico, las fuentes y la versión del escrito que se aprobará. Esta revisión profesional es distinta de la revisión técnica del desarrollo. |

Antigravity y Codex son los entornos de trabajo. Se debe verificar la carpeta y la versión del código para que el desarrollo y la revisión se refieran a los mismos cambios.

Cada entrega sigue este circuito:

1. Ema y el asistente concretan el problema y el resultado esperado.
2. Se implementa el alcance autorizado y se verifican funcionamiento, permisos y conservación de datos.
3. Se prepara para Bartolito un paquete con cambios, versión del código, pruebas realizadas, forma de reproducirlas y puntos pendientes.
4. Cuando se recibe su revisión, se registran las observaciones, se corrigen y se comprueba el resultado.
5. Ema valida el uso y se actualiza el estado de la entrega y el próximo objetivo.

Las comprobaciones del asistente forman parte de cada entrega. No se atribuye a Bartolito una aprobación que no se haya recibido; implementación, validación funcional y revisión técnica se registran por separado. Preparar material para su revisión no implica que ya se le haya enviado.

## Qué significa mejorar

| Resultado buscado | Comportamiento que debe poder demostrarse |
|---|---|
| Menos documentos perdidos | Cada requisito tiene estado, responsable de seguimiento y archivo recibido identificable. |
| Menos expedientes detenidos | Se ve el bloqueo, quién puede resolverlo y la próxima acción. |
| Mejor delegación | El titular revisa la versión exacta entregada por el junior y las correcciones quedan registradas. |
| Análisis comprobable | Un dato extraído o una cita permite abrir su documento de origen y localizar el pasaje correspondiente. |
| Seguimiento consistente | Los compromisos y cuotas pendientes aparecen en Mi Jornada y los cumplidos dejan de generar avisos. |
| Control profesional | Las propuestas de la IA se distinguen de los datos confirmados y de las decisiones aprobadas por un abogado. |

Estas son metas propias; no implican que Argus carezca de esas capacidades. La comparación pública anterior no fue una prueba de su producto privado.

## Entrega 0 — Base de documentos utilizable

Avance del 19/10/2026: carga real, almacenamiento privado, descarga autenticada y controles de acceso implementados y probados localmente. Detalles y límites en [la entrega para revisión de Bartolito](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ENTREGA_ARCHIVOS_PARA_REVISION.md>). La posterior entrega de seguimiento reconcilió los índices de tareas y aplicó sus migraciones sobre la base local con respaldo y ensayo previo; conservó todos los registros anteriores. La diferencia de checksum histórico del SQL inicial se documenta sin reescribir ese registro.

Prioridad inmediata para habilitar el resto:

- Esquema local reconciliado y migraciones nuevas aplicadas conservando datos; revisar la procedencia del checksum inicial, según [la entrega de seguimiento](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ENTREGA_SEGUIMIENTO_PARA_REVISION.md>).
- Carga real de archivos: completada en [CaseFilePanel](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/client/src/components/CaseFilePanel.jsx>). Se reemplazó el registro de URLs simuladas por contenido multipart y descarga privada.
- Guardar y servir los documentos mediante acceso autorizado por expediente, tanto para estudios como para titulares independientes.
- Validar tamaño y formatos admitidos; informar fallos de carga sin mostrar un éxito ficticio.
- Conservar nombre original y una identidad de almacenamiento propia, evitando que un archivo nuevo pise otro.

Criterio de aceptación: cargar un PDF de prueba, cerrar la sesión, volver a ingresar y descargar exactamente los mismos bytes. Otro estudio, otro titular independiente y una solicitud sin sesión deben quedar bloqueados. Un error de almacenamiento no debe dejar un archivo aparentemente disponible.

## Entrega 1 — Documentación pendiente y compromisos del cliente

Implementada y activada localmente el 19/10/2026. Pasaron 25 pruebas nuevas y 109 en la suite completa, la compilación del cliente, una instalación desde cero y el circuito en navegador con operador y abogada ficticios. Pendientes: validación de uso por Ema y revisión técnica de Bartolito. [Entrega y reproducción](<C:/Users/Usuario/Desktop/antigravity lyp/HoyporHoy/ENTREGA_SEGUIMIENTO_PARA_REVISION.md>).

- Requisito documental por expediente, con fecha acordada y responsable del seguimiento.
- Estados: pendiente, recibido, requiere corrección y verificado.
- Relación entre el requisito y un archivo existente; recibir un documento no equivale a verificar su contenido.
- Compromisos del cliente con fecha, descripción e historial de cumplimiento.
- Motivo de bloqueo y próxima acción, separados del estado procesal del caso.
- Pendientes y atrasos en Mi Jornada.
- Preparación de mensajes de seguimiento para revisar y enviar por WhatsApp.

Criterio de aceptación: pedir un recibo para una fecha, asignar el seguimiento a un operador, verlo en su jornada, recibir el archivo y permitir que el abogado lo verifique o solicite una corrección. Al completarlo, debe desaparecer de los pendientes.

## Entrega 2 — Honorarios y cobranzas

Primera versión implementada y activada localmente el 28/10/2026: acuerdo en ARS, cuotas, pagos parciales, saldo, historial, pendientes en Mi jornada y recordatorios para copiar con el importe actualizado. Ampliaciones posteriores: [rectificación mediante anulación de pagos](ENTREGA_RECTIFICACION_PAGOS.md) y [modificación de acuerdos/cuotas](ENTREGA_MODIFICACION_ACUERDOS.md), ambas con motivo, autor e historial. Los cambios del acuerdo llevan control de versión y conservan los pagos. También están implementados y activados localmente los [comprobantes privados de pagos e historial de reemplazos](ENTREGA_COMPROBANTES_PAGOS.md), con circuito en navegador y 360 pruebas completas aprobadas; esa entrega documenta los modos de ejecución y sus límites en Windows. Migraciones ensayadas con respaldo y conservación de datos. Ver [entrega y límites para revisión](ENTREGA_HONORARIOS_PARA_REVISION.md). Pendientes: validación de uso, revisión técnica, otras monedas y automatización de avisos.

- Acuerdo de honorarios, cuotas, vencimientos, pagos parciales y saldo.
- Separación entre gastos del expediente y honorarios que debe pagar el cliente.
- Compromisos de pago y preparación de recordatorios con el importe pendiente actualizado.
- Registro del seguimiento y retiro de avisos cuando el pago correspondiente queda registrado.

Criterio de aceptación: un pago parcial reduce el saldo y el importe del recordatorio; un pago completo retira el aviso pendiente sin borrar el historial.

## Entrega 3 — Escritos y revisión sobre versiones

Ampliación implementada: [entregas de tareas vinculadas a una versión exacta y revisión de esa entrega](ENTREGA_REVISION_VERSIONES.md). Incluye correcciones, nueva entrega y aprobación con historial; una versión posterior no hereda esa aprobación. La biblioteca de modelos se implementó en la ampliación del 29/10/2026; ver ENTREGA_BIBLIOTECA_MODELOS.md.

Primera parte implementada y activada localmente el 28/10/2026: escritos manuales por expediente, versiones persistentes con autor y motivo, consulta y restauración de históricos, comparación de dos textos guardados y exportación Word de la versión seleccionada. La migración se ensayó con respaldo y conservación de datos. Ver [alcance y comprobaciones](ENTREGA_ESCRITOS_VERSIONADOS.md). La vinculación de entregas, correcciones y aprobaciones a una versión concreta se completó en la ampliación posterior. La biblioteca de modelos también está implementada; guardar una versión no la aprueba.

- Biblioteca de modelos del estudio con parámetros de jurisdicción, fuero y tipo de escrito.
- Edición y versiones persistentes por expediente.
- Entrega de tarea vinculada a una versión concreta y comparación entre versiones.
- Correcciones y aprobación referidas a esa entrega. Una modificación posterior genera otra versión pendiente de revisión.
- Exportación a Word de la versión seleccionada.

Criterio de aceptación: el junior entrega la versión 1, el titular pide cambios y el junior presenta la versión 2. Debe poder verse qué se entregó y qué se aprobó; una versión 3 no hereda automáticamente la aprobación anterior.

## Entrega 4 — Análisis documental y fuentes jurídicas

Decisión vigente de Ema del 26/10/2026: continuar jurisprudencia **solo con fuentes oficiales, sin IA**. Se retiró OpenAI del panel y se implementaron accesos a SAIJ y al Poder Judicial de Córdoba, con registro de referencias por expediente. Ver [alcance, límites y pruebas](ENTREGA_JURISPRUDENCIA_OFICIAL.md). Los portales son fuentes diferenciadas; la disponibilidad pública de una consulta no demuestra que exista una API de integración.

Implementado: registro manual de título, tribunal, fecha, enlace y extracto o notas; el servidor agrega fuente, usuario y fecha de registro. Solo admite HTTPS de los dominios de SAIJ y Justicia Córdoba. Se conserva el aislamiento por estudio y titular independiente. Las referencias se presentan como ingresadas por el usuario, sin verificación automática del fallo. Los registros históricos se identifican como no verificados.

Pendiente: recuperación automática por tema y filtros, con documentos reales y mecanismos de acceso comprobados. Durante la revisión SAIJ respondió 403 y el portal de Córdoba agotó el tiempo de espera; esto no acredita una indisponibilidad general. No se implementó una integración automática ni se generan títulos o conclusiones jurídicas con un modelo.

Las siguientes capacidades documentales siguen como trabajo futuro, con alcance y autorizaciones por definir:

- Extracción de texto y OCR cuando sea necesario, conservando referencias a páginas de origen.
- Hechos, fechas, partes y documentación faltante propuestos para confirmación.
- Preguntas sobre el expediente que distingan respuestas apoyadas en documentos de inferencias o información ausente.
- Recuperación de jurisprudencia desde fuentes identificables, con tribunal, fecha, enlace y fragmento utilizado.
- Separación entre comprobar que una fuente existe, comprobar que respalda una cita y evaluar su pertinencia para el caso.

El panel actual permite consultar portales y registrar referencias; no se presenta como búsqueda automática de fallos verificados.

Criterio de aceptación: para cada afirmación atribuida a un documento o fallo, el revisor puede abrir la fuente y localizar el soporte. Si no se encuentra, la aplicación lo indica y permite corregir o retirar la afirmación.

## Entrega 5 — Conexión judicial y agenda asistida

- Elegir una jurisdicción piloto según el volumen real de trabajo del estudio.
- Comprobar mecanismos disponibles de integración y acceso antes de prometer sincronización.
- Importar novedades con procedencia e historial, evitando duplicados.
- Proponer citas y tareas desde las novedades, con confirmación del usuario y conservación de sus ajustes manuales.

Criterio de aceptación: la misma novedad importada dos veces no duplica eventos; una actualización posterior no pisa una corrección manual y permite volver al documento de origen.

## Cómo evaluar la mejora

Medir con casos representativos y datos ficticios o autorizados:

- Tiempo para identificar el próximo paso de un expediente.
- Tiempo dedicado a perseguir documentación pendiente.
- Tiempo de preparación y revisión de un escrito.
- Citas o afirmaciones sin soporte y correcciones necesarias antes de aprobar.
- Pendientes vencidos y avisos incorrectos después de registrar un cumplimiento o pago.
- Acciones de acceso indebido rechazadas y resultados conservados tras cerrar sesión.

Primero se registra una línea de base del proceso actual. Después se prueba cada entrega sobre los mismos escenarios. Las metas numéricas y cualquier comparación de rendimiento con Argus se fijarán con esas mediciones.

## Estado de este documento

Las entregas 0 y 1 están implementadas localmente y conservan la revisión técnica pendiente. La entrega 2 tiene una primera versión local operativa de acuerdos, cuotas, pagos, saldo y recordatorios manuales; conserva las ampliaciones y revisiones indicadas arriba. La entrega 3 tiene implementados escritos versionados, Word y revisión de entregas vinculadas a versiones concretas, con comprobación en navegador. La biblioteca de modelos también quedó implementada localmente, con campos parametrizados y copia a un escrito nuevo. La entrega 5 sigue pendiente. La entrega 4 tiene un alcance parcial implementado sin IA: portales oficiales y registro manual de referencias; la recuperación automática y el análisis documental siguen pendientes.

La numeración de las etapas de corrección técnica del chat es independiente de las entregas de producto de este documento. Se completaron seis etapas de corrección: registro y permisos, vencimientos y zona horaria, Configuración y controles de calidad, dependencias, comprobantes reales y jurisprudencia sin IA. La séptima etapa aborda la carga del cliente; ver [entrega de optimización](ENTREGA_CARGA_CLIENTE.md).
