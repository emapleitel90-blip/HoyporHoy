---
name: creador-de-habilidades
description: Habilidad especializada en la creación y estructuración de nuevas habilidades para el asistente Antigravity, con soporte nativo para el idioma español.
---

# Creador de Habilidades

Esta habilidad te permite crear nuevas habilidades para el espacio de trabajo siguiendo los estándares de Antigravity.

## Cuándo usar esta habilidad
- Cuando el usuario solicite una nueva capacidad persistente para el agente.
- Cuando sea necesario automatizar o estandarizar un flujo de trabajo recurrente.
- Cuando se requiera documentación estructurada sobre "cómo hacer algo" que el agente deba recordar.

## Cómo crear una habilidad
1. **Identificar la necesidad**: Define qué tarea específica resolverá la habilidad.
2. **Estructura de Carpeta**: Crea una nueva carpeta en `.agent/skills/<nombre-de-la-habilidad>`.
3. **Archivo SKILL.md**: Crea un archivo llamado `SKILL.md` dentro de esa carpeta.
4. **Frontmatter**: Incluye el nombre único y una descripción clara que ayude a la "Activación" de la habilidad.
5. **Instrucciones**: Escribe instrucciones detalladas en Markdown sobre cómo ejecutar la tarea.

## Formato del SKILL.md
```markdown
---
name: nombre-unico-vincular
description: Breve resumen para el descubrimiento de la habilidad.
---

# Título de la Habilidad

Instrucciones detalladas aquí...
```

## Reglas de Oro
- Mantén cada habilidad enfocada en un solo propósito.
- Usa un lenguaje claro y accionable.
- En este espacio de trabajo, prefiere el idioma **español** para las instrucciones si el usuario así lo requiere.
