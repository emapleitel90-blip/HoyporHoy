import prisma from '../utils/prismaClient.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { validFormSections } from '../utils/formConfigValidation.js';

const DEFAULT_SECTIONS = [
    {
        id: 'datos-consultante',
        title: '1. Datos del Consultante',
        description: 'Información personal y de contacto del cliente.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'clientName', label: 'Nombre y Apellido completo', type: 'text', required: true },
            { name: 'dni', label: 'DNI / CUIT / CUIL', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'phone', label: 'Teléfono', type: 'text' },
            { name: 'address', label: 'Domicilio', type: 'text', fullWidth: true },
            { name: 'estadoCivil', label: 'Estado civil', type: 'select', options: ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Conviviente'] },
        ]
    },
    {
        id: 'perfil-socioeconomico',
        title: '2. Perfil Socioeconómico',
        description: 'Evaluación patrimonial y laboral.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'situacionLaboral', label: 'Situación laboral', type: 'select', options: ['Relación de dependencia', 'Autónomo', 'Desempleado', 'Jubilado'] },
            { name: 'ingresos', label: 'Ingresos mensuales', type: 'text' },
            { name: 'propiedades', label: 'Bienes a su nombre', type: 'textarea', fullWidth: true },
        ]
    },
    {
        id: 'informacion-caso',
        title: '3. Información del Caso',
        description: 'Detalles procesales y de fondo.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'fuero', label: 'Fuero', type: 'select', required: true, options: ['Civil', 'Comercial', 'Laboral', 'Familia', 'Penal', 'Administrativo'] },
            { name: 'juzgado', label: 'Juzgado/Tribunal', type: 'text' },
            { name: 'contraparte', label: 'Contraparte', type: 'text' },
            { name: 'descripcion', label: 'Relato de los hechos', type: 'textarea', fullWidth: true, rows: 4 },
        ]
    },
    {
        id: 'plazos-urgencias',
        title: '4. Plazos y Urgencias',
        description: 'Fechas críticas y nivel de prioridad.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'fechaPrescripcion', label: 'Fecha estimada de prescripción', type: 'date' },
            { name: 'proximaAudiencia', label: 'Próxima Audiencia', type: 'date' },
        ]
    },
    {
        id: 'clasificacion-juridica',
        title: '5. Clasificación Jurídica',
        description: 'Tipificación técnica del caso.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'tipoProceso', label: 'Tipo de Proceso', type: 'text' },
            { name: 'montoReclamado', label: 'Monto Reclamado', type: 'text' },
        ]
    },
    {
        id: 'documentacion',
        title: '6. Documentación Presentada',
        description: 'Checklist de documentos aportados.',
        enabled: true,
        type: 'checklist',
        items: [
            'DNI / Documento de identidad',
            'CUIL / CUIT',
            'Contrato / Documento base',
            'Cartas Documento / Telegramas',
            'Recibos / Comprobantes',
            'Prueba Documental Extra'
        ]
    },
    {
        id: 'scoring',
        title: '7. Scoring de Admisión',
        description: 'Cálculo automático de viabilidad.',
        enabled: true,
        type: 'scoring'
    },
    {
        id: 'analisis-psicologico',
        title: '8. Análisis del Consultante',
        description: 'Estado emocional y red de apoyo.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'estadoEmocional', label: 'Estado Emocional', type: 'select', options: ['Estable', 'Angustiado', 'Agresivo', 'Confuso'] },
            { name: 'motivacion', label: 'Motivación principal', type: 'text' },
        ]
    },
    {
        id: 'expectativas',
        title: '9. Expectativas del Cliente',
        description: 'Qué espera obtener el cliente.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'resultadoEsperado', label: 'Resultado buscado', type: 'textarea', fullWidth: true },
            { name: 'disposicionNegociar', label: 'Disposición a conciliar', type: 'select', options: ['Alta', 'Media', 'Baja', 'Nula'] },
        ]
    },
    {
        id: 'evaluacion-lyp',
        title: '10. Evaluación Jurídica LyP',
        description: 'Opinión profesional del estudio.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'viabilidad', label: 'Viabilidad Jurídica', type: 'select', options: ['Alta', 'Media', 'Baja', 'Nula'] },
            { name: 'estrategia', label: 'Estrategia Recomendada', type: 'textarea', fullWidth: true },
            { name: 'admision', label: 'Decisión de Admisión', type: 'select', options: ['Admitido', 'Rechazado', 'En estudio'] },
        ]
    },
    {
        id: 'foda',
        title: '11. Análisis FODA',
        description: 'Fortalezas, Oportunidades, Debilidades y Amenazas.',
        enabled: true,
        type: 'foda'
    },
    {
        id: 'timeline',
        title: '12. Línea de Tiempo',
        description: 'Hitos cronológicos del conflicto.',
        enabled: true,
        type: 'timeline'
    },
    {
        id: 'administrativo',
        title: '13. Administrativo e Intervención',
        description: 'Honorarios y asignación interna.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'honorarios', label: 'Modalidad de Honorarios', type: 'select', options: ['Cuota Litis', 'Monto Fijo', 'Abono', 'Regulados'] },
            { name: 'assignedLawyerId', label: 'Abogado Responsable', type: 'select' },
            { name: 'notasInternas', label: 'Notas Administrativas', type: 'textarea', fullWidth: true },
        ]
    }
];

const scopeFor = user => user.studioId ? `studio:${user.studioId}` : `user:${user.id}`;

function canEdit(user) {
    return user.studioId
        ? ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
        : ['ADMIN', 'SUPER_ADMIN', 'LAWYER'].includes(user.role);
}

function readSections(config) {
    if (!config) return null;
    try {
        const sections = JSON.parse(config.sections);
        return validFormSections(sections) ? sections : null;
    } catch {
        return null;
    }
}

function sendConfig(res, user, version, sections) {
    res.set('Cache-Control', 'private, no-store');
    res.json({ sections, version, canEdit: canEdit(user) });
}

export async function getFormConfig(req, res, next) {
    try {
        const config = await prisma.formConfig.findUnique({ where: { scope: scopeFor(req.user) } });
        let sections = readSections(config);
        if (!sections) {
            const legacyTemplate = await prisma.formConfig.findUnique({ where: { scope: 'global' } });
            sections = readSections(legacyTemplate) ?? DEFAULT_SECTIONS;
        }
        sendConfig(res, req.user, config?.version ?? 0, sections);
    } catch (error) {
        next(error);
    }
}

async function saveConfig(req, res, next, reset = false) {
    try {
        if (!canEdit(req.user)) {
            throw new AppError('Tu perfil solo puede consultar la configuración de admisión.', 403);
        }
        const version = req.body?.version;
        if (!Number.isSafeInteger(version) || version < 0 || version >= 2147483647) {
            throw new AppError('Recargá la configuración antes de guardar.', 400);
        }
        const sections = reset ? DEFAULT_SECTIONS : req.body?.sections;
        if (!validFormSections(sections)) {
            throw new AppError('Revisá la estructura del formulario. Debe quedar al menos un módulo habilitado.', 400);
        }
        const scope = scopeFor(req.user);
        const storedSections = JSON.stringify(sections);
        const config = version === 0
            ? await prisma.formConfig.create({ data: { scope, sections: storedSections } })
            : await prisma.formConfig.update({
                where: { scope, version },
                data: { sections: storedSections, version: { increment: 1 } },
            });
        sendConfig(res, req.user, config.version, sections);
    } catch (error) {
        if (['P2002', 'P2025'].includes(error.code)) {
            return next(new AppError('La configuración cambió desde que la abriste. Recargala antes de guardar.', 409));
        }
        next(error);
    }
}

export const updateFormConfig = (req, res, next) => saveConfig(req, res, next);
export const resetFormConfig = (req, res, next) => saveConfig(req, res, next, true);
