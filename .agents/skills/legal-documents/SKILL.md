---
name: legal-documents
description: Diseña el circuito de adjuntos, borradores y generación DOCX de escritos, cédulas y oficios vinculados a expedientes. Usar al trabajar en documentos, versiones, descargas, plantillas y revisión de escritos.
---

# Documentos jurídicos del expediente

## Objetivo
Permitir subir, encontrar, descargar y revisar documentos seguros de cada expediente, además de generar borradores .docx mediante el módulo existente `server/src/skills/documentRedactor.js`.

## Proceso
1. Leer `CaseFile`, middleware Multer, controladores, rutas y panel de documentos. Verificar dónde se almacena realmente el archivo.
2. Restringir subida y descarga con `protect`, pertenencia al expediente, tamaño, tipo MIME y autorización. Nunca exponer `/uploads` como directorio público ni confiar en URLs arbitrarias enviadas por frontend.
3. Mostrar archivo, autor, fecha, tipo y estado de revisión. Si se agregan versiones, conservar enlace al expediente y recuperar la anterior.
4. Reutilizar plantillas existentes `cedula`, `oficio`, `escrito`. Presentar el resultado como **borrador sujeto a control profesional**. No afirmar que es documento judicial oficial ni que fue presentado electrónicamente.
5. Introducir revisión por titular como primer paso de versionado sin edición simultánea compleja.
6. Ante fallo de descarga, archivo inexistente o token vencido, mostrar error claro sin filtrar rutas de servidor.

## Garantías jurídicas
No inventar carátulas, actuaciones, firma, matrículas profesionales o resoluciones judiciales. Verificar formato y destinatario según fuero y jurisdicción. Un texto de ejemplo jamás constituye una notificación válida por sí mismo.

## Aceptación
Subir PDF/DOCX autorizado → ver lista → descargar autenticado → generar DOCX → modificar como borrador → asociar a revisión. Acceso cross-tenant y descarga sin token denegados mediante pruebas reales.
