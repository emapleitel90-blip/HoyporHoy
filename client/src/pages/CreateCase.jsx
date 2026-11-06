import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import React, { useState, useEffect, useCallback } from 'react';
import { Save, ArrowRight, ArrowLeft, Plus, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';

import { Field, Select, Textarea, SectionInfo, SCORING_ITEMS, SCORE_VALUES, getScoreLabel } from '../components/CreateCaseForms';

const DEFAULT_SECTIONS = [
    {
        id: 'datos-consultante',
        title: '1. Datos del Consultante',
        description: 'Información personal y de contacto del cliente.',
        enabled: true,
        type: 'standard',
        fields: [
            { name: 'clientName', label: 'Nombre y Apellido completo', type: 'text', required: true },
            { name: 'dni', label: 'DNI / CUIT', type: 'text', required: true },
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
            { name: 'urgencia', label: 'Nivel de Urgencia', type: 'select', options: ['Baja', 'Media', 'Alta', 'Urgente (Plazos corriendo)'] },
            { name: 'fechaPrescripcion', label: 'Fecha de Prescripción', type: 'date' },
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

// ─── Dynamic field renderer ────────────────────────────────────────────────────
const DynamicField = ({ field, formData, handleChange, studioUsers = [] }) => {
    if (field.name === 'assignedLawyerId' || field.name === 'abogadoAsignado') {
        return (
            <div className={field.fullWidth ? 'col-span-2' : ''}>
                <Label htmlFor="assignedLawyerId" className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                    {field.label}
                </Label>
                <NativeSelect
                    id="assignedLawyerId"
                    name="assignedLawyerId"
                    value={formData.assignedLawyerId || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all font-medium"
                >
                    <option value="">Sin asignar / Seleccionar responsable...</option>
                    {formData.assignedLawyerId && !studioUsers.some(u => u.id === formData.assignedLawyerId) && (
                        <option value={formData.assignedLawyerId}>Responsable actual (no disponible)</option>
                    )}
                    {studioUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                </NativeSelect>
            </div>
        );
    }
    if (field.type === 'textarea') {
        return (
            <div className={field.fullWidth ? 'col-span-2' : ''}>
                <Textarea label={field.label} name={field.name} value={formData[field.name] || ''} onChange={handleChange} placeholder={field.placeholder} rows={field.rows || 3} />
            </div>
        );
    }
    if (field.type === 'select' && field.options) {
        return (
            <Select label={field.label} name={field.name} value={formData[field.name] || ''} onChange={handleChange} options={field.options} required={field.required} />
        );
    }
    return (
        <div className={field.fullWidth ? 'col-span-2' : ''}>
            <Field label={field.label} name={field.name} type={field.type || 'text'} value={formData[field.name] || ''} onChange={handleChange} required={field.required} placeholder={field.placeholder} />
        </div>
    );
};

// ─── CreateCase ────────────────────────────────────────────────────────────────
const CreateCase = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { user, getToken } = useAuth();
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [formData, setFormData] = useState({});
    const [scoring, setScoring] = useState({});
    const [customItems, setCustomItems] = useState({}); // { sectionId: [items] }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [sections, setSections] = useState([]);
    const [studioUsers, setStudioUsers] = useState([]);
    const [caseStudioId, setCaseStudioId] = useState(undefined);
    const [caseOwner, setCaseOwner] = useState(null);
    const [usersError, setUsersError] = useState(null);
    const isEditMode = !!id;

    useEffect(() => {
        let cancelled = false;
        const fetchUsers = async () => {
            const targetStudioId = isEditMode ? caseStudioId : user?.studioId;
            setUsersError(null);
            setStudioUsers([]);
            if (isEditMode && caseStudioId === undefined) return;
            if (!targetStudioId) {
                const owner = isEditMode ? caseOwner : user;
                if (owner && ['ADMIN', 'LAWYER', 'SUPER_ADMIN'].includes(owner.role)) setStudioUsers([owner]);
                return;
            }
            try {
                const res = await fetch(api.studios.users(targetStudioId), {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                });
                if (!res.ok) throw new Error('No se pudieron cargar los responsables del estudio.');
                const data = await res.json();
                if (!cancelled) setStudioUsers(data.filter(u => ['ADMIN', 'LAWYER', 'SUPER_ADMIN'].includes(u.role)));
            } catch (err) {
                if (!cancelled) setUsersError(err.message);
            }
        };
        fetchUsers();
        return () => { cancelled = true; };
    }, [user, caseStudioId, caseOwner, isEditMode, getToken]);

    const fetchFormConfig = useCallback(async () => {
        try {
            const response = await fetch(api.formConfig.get, {
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                setSections(DEFAULT_SECTIONS.filter(s => s.enabled));
                setActiveSectionId(DEFAULT_SECTIONS[0].id);
                return;
            }

            const data = await response.json();

            if (!data || !data.sections) {
                // Si no hay configuración o falla, cargamos las por defecto
                setSections(DEFAULT_SECTIONS.filter(s => s.enabled));
                setActiveSectionId(DEFAULT_SECTIONS[0].id);
            } else {
                const parsedSections = typeof data.sections === 'string' ? JSON.parse(data.sections) : data.sections;
                const enabledSections = (parsedSections || []).filter(s => s.enabled);
                setSections(enabledSections);
                if (enabledSections.length > 0) {
                    setActiveSectionId(enabledSections[0].id);
                }
            }
        } catch (err) {
            console.error('Error loading form config', err);
            setSections(DEFAULT_SECTIONS.filter(s => s.enabled));
            setActiveSectionId(DEFAULT_SECTIONS[0].id);
        } finally {
            if (!isEditMode) setLoading(false);
        }
    }, [getToken, isEditMode]);

    const fetchCaseDetails = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(api.cases.get(id), {
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Error cargando el caso');
            }

            const data = await response.json();

            setCaseStudioId(data.studioId || null);
            setCaseOwner(data.createdBy || null);
            let parsedDetails = {};
            if (data.details) {
                parsedDetails = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
            }
            setFormData({
                ...parsedDetails,
                clientName: data.clientName,
                title: data.title,
                description: data.description,
                assignedLawyerId: data.assignedLawyerId || data.assignedLawyer?.id || ''
            });
            if (parsedDetails.scoring) setScoring(parsedDetails.scoring);
            if (parsedDetails.customItems) setCustomItems(parsedDetails.customItems);
        } catch (err) {
            setError(err.message || 'Error cargando el caso');
        } finally {
            setLoading(false);
        }
    }, [id, getToken]);

    useEffect(() => {
        fetchFormConfig();
    }, [fetchFormConfig]);

    useEffect(() => {
        if (isEditMode && sections.length > 0) fetchCaseDetails();
    }, [isEditMode, sections, fetchCaseDetails]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleScoreSelect = (key, color) => {
        setScoring(prev => ({ ...prev, [key]: color }));
    };

    const handleAddCustomItem = (sectionId) => {
        const newItem = prompt('Ingresa el nombre del elemento adicional:');
        if (!newItem) return;
        setCustomItems(prev => ({
            ...prev,
            [sectionId]: [...(prev[sectionId] || []), newItem]
        }));
    };

    const handleRemoveCustomItem = (sectionId, idx) => {
        setCustomItems(prev => {
            const newItems = [...(prev[sectionId] || [])];
            newItems.splice(idx, 1);
            return { ...prev, [sectionId]: newItems };
        });
    };

    const totalScore = Object.values(scoring).reduce((acc, color) => acc + (SCORE_VALUES[color] || 0), 0);
    const scoreLabel = getScoreLabel(totalScore);

    const handleSubmit = async () => {
        try {
            setSaving(true);
            setError(null);

            if (!user) {
                showToast('Usuario no autenticado', 'error');
                return;
            }

            const payload = {
                title: formData.clientName ? `Caso de ${formData.clientName}` : 'Nuevo Caso',
                clientName: formData.clientName,
                description: formData.descripcion || formData.descripcionCaso || formData.description || 'Sin descripción',
                fuero: formData.fuero || null,
                score: totalScore > 0 ? totalScore : null,
                assignedLawyerId: formData.assignedLawyerId || null,
                details: { ...formData, scoring, customItems }
            };

            if (isEditMode) {
                const response = await fetch(api.cases.update(id), {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + getToken(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Error al actualizar el caso');
                }

                showToast('Caso actualizado con éxito', 'success');
            } else {
                const response = await fetch(api.cases.create, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer ' + getToken(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.message || 'Error al crear el caso');
                }

                showToast('Caso creado con éxito', 'success');
            }
            notifyActivityChanged();
            navigate('/cases');
        } catch (err) {
            setError(err.message || 'Error al guardar el caso');
            showToast('Error al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const currentSection = sections.find(s => s.id === activeSectionId);
    const currentIndex = sections.findIndex(s => s.id === activeSectionId);

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-ring"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">{isEditMode ? 'Editar Expediente' : 'Alta de Nuevo Caso'}</h2>
                    <p className="text-muted-foreground font-medium">Entrevista de admisión y clasificación jurídica LyP.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="legacy" size="legacy" className="px-6 py-2.5 bg-card border border-border text-secondary-foreground rounded-2xl font-bold text-sm hover:bg-background transition-all" onClick={() => navigate('/cases')}>
                        Cancelar
                    </Button>
                    <Button variant="legacy" size="legacy"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>{saving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Finalizar Admisión')}</span>
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-status-red animate-in shake duration-500">
                    <X className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <Card className="bg-card rounded-[32px] border border-border shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">
                {/* Sidebar Stepper */}
                <div className="w-full md:w-72 bg-background border-r border-border overflow-y-auto">
                    <div className="p-6">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6">Módulos de Admisión</p>
                        <nav className="space-y-1.5">
                            {sections.map((section, idx) => {
                                const isActive = activeSectionId === section.id;
                                return (
                                    <Button variant="legacy" size="legacy"
                                        key={section.id}
                                        onClick={() => setActiveSectionId(section.id)}
                                        className={`w-full flex items-center text-left px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                                            ? 'bg-card text-link shadow-md ring-1 ring-ring translate-x-1'
                                            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                                    >
                                        <span className={`w-6 h-6 flex-shrink-0 inline-flex items-center justify-center rounded-lg text-[11px] font-black mr-3 ${isActive ? 'bg-indigo-600 text-white' : 'bg-secondary text-muted-foreground'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className={`text-sm font-bold leading-tight ${isActive ? 'text-foreground' : ''}`}>{section.title}</span>
                                    </Button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-10 overflow-y-auto bg-card">
                    <div className="max-w-3xl">
                        <div className="mb-10">
                            <h3 className="text-2xl font-black text-foreground tracking-tight">
                                {currentSection?.title}
                            </h3>
                            <div className="h-1.5 w-12 bg-indigo-600 rounded-full mt-2"></div>
                        </div>

                        {/* ── SPECIAL TYPE: Checklist (Documentación) ── */}
                        {currentSection?.type === 'checklist' && (
                            <div className="space-y-8">
                                <SectionInfo>{currentSection.description || 'Marque los elementos disponibles.'}</SectionInfo>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Default items from config */}
                                    {(currentSection.items || []).map(item => (
                                        <Label key={item} className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                                            formData[`check_${currentSection.id}_${item}`]
                                            ? 'bg-indigo-50 border-ring shadow-sm'
                                            : 'bg-card border-border hover:border-border'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={!!(formData[`check_${currentSection.id}_${item}`])}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [`check_${currentSection.id}_${item}`]: e.target.checked }))}
                                                className="w-5 h-5 text-link border-border rounded-lg focus:ring-ring"
                                            />
                                            <span className={`text-sm font-bold ${formData[`check_${currentSection.id}_${item}`] ? 'text-link' : 'text-secondary-foreground'}`}>{item}</span>
                                        </Label>
                                    ))}

                                    {/* Custom items added by user */}
                                    {(customItems[currentSection.id] || []).map((item, idx) => (
                                        <div key={`custom-${idx}`} className="flex items-center space-x-3 p-4 rounded-2xl border bg-indigo-50/30 border-ring group">
                                            <input
                                                type="checkbox"
                                                checked={!!(formData[`check_${currentSection.id}_custom_${idx}`])}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [`check_${currentSection.id}_custom_${idx}`]: e.target.checked }))}
                                                className="w-5 h-5 text-link border-ring rounded-lg focus:ring-ring"
                                            />
                                            <span className="text-sm font-bold text-link flex-1">{item}</span>
                                            <Button variant="legacy" size="legacy"
                                                onClick={() => handleRemoveCustomItem(currentSection.id, idx)}
                                                className="text-muted-foreground hover:text-status-red opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    ))}

                                    <Button variant="legacy" size="legacy"
                                        onClick={() => handleAddCustomItem(currentSection.id)}
                                        className="flex items-center justify-center space-x-2 p-4 rounded-2xl border border-border border-dashed hover:bg-background hover:border-ring transition-all text-muted-foreground hover:text-link"
                                    >
                                        <Plus size={18} />
                                        <span className="text-sm font-bold">Agregar Personalizado</span>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── SPECIAL TYPE: Scoring ── */}
                        {currentSection?.type === 'scoring' && (
                            <div className="space-y-6">
                                <SectionInfo>{currentSection.description}</SectionInfo>
                                <div className="space-y-4">
                                    {SCORING_ITEMS.map((item) => (
                                        <div key={item.key} className="bg-background/50 p-6 rounded-[24px] border border-border">
                                            <div className="mb-4">
                                                <p className="font-black text-foreground text-sm tracking-tight">{item.label}</p>
                                                <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{item.desc}</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['verde', 'amarillo', 'rojo'].map(color => (
                                                    <Button variant="legacy" size="legacy"
                                                        key={color}
                                                        onClick={() => handleScoreSelect(item.key, color)}
                                                        className={`flex items-center justify-center p-3 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${scoring[item.key] === color
                                                                ? color === 'verde' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                                                                    : color === 'amarillo' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                                                                        : 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                                                                : 'bg-card border-border text-muted-foreground hover:border-border'
                                                            }`}
                                                    >
                                                        {color}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="admission-score mt-10 p-8 bg-primary rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-900/40">
                                    <div className="text-center md:text-left mb-6 md:mb-0">
                                        <h4 className="text-xl font-black tracking-tight">Evaluación de Admisión</h4>
                                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">{Object.keys(scoring).length} de {SCORING_ITEMS.length} métricas completadas</p>
                                    </div>
                                    <div className="text-center md:text-right">
                                        {scoreLabel ? (
                                            <>
                                                <span className="block text-5xl font-black leading-none text-primary-foreground">{totalScore} pts</span>
                                                <span className={`inline-block mt-3 px-4 py-1.5 ${scoreLabel.bg} ${scoreLabel.color} rounded-full text-[10px] font-black uppercase tracking-widest`}>
                                                    {scoreLabel.label}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground text-sm font-bold">Pendiente de evaluación</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── SPECIAL TYPE: FODA / Timeline / Standard ── */}
                        {currentSection && !['checklist', 'scoring'].includes(currentSection.type) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <SectionInfo>{currentSection.description}</SectionInfo>
                                {currentSection.fields?.map((field, idx) => (
                                    <DynamicField
                                        key={`${currentSection.id}-${field.name}-${idx}`}
                                        field={field}
                                        formData={formData}
                                        handleChange={handleChange}
                                        studioUsers={studioUsers}
                                    />
                                ))}
                                {usersError && <p role="alert" className="col-span-full text-sm text-status-red">{usersError}</p>}
                            </div>
                        )}

                        {/* ── Fallback for FODA/Timeline if not mapped to standard fields ── */}
                        {currentSection?.type === 'foda' && !currentSection.fields && (
                            <div className="grid grid-cols-1 gap-6">
                                <Textarea label="Fortalezas" name="fodaFortalezas" value={formData.fodaFortalezas || ''} onChange={handleChange} rows={4} />
                                <Textarea label="Oportunidades" name="fodaOportunidades" value={formData.fodaOportunidades || ''} onChange={handleChange} rows={4} />
                                <Textarea label="Debilidades" name="fodaDebilidades" value={formData.fodaDebilidades || ''} onChange={handleChange} rows={4} />
                                <Textarea label="Amenazas" name="fodaAmenazas" value={formData.fodaAmenazas || ''} onChange={handleChange} rows={4} />
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <Button variant="legacy" size="legacy"
                    onClick={() => {
                        if (currentIndex > 0) setActiveSectionId(sections[currentIndex - 1].id);
                    }}
                    disabled={currentIndex <= 0}
                    className="flex items-center space-x-2 px-6 py-3 border border-border rounded-2xl font-bold text-sm text-secondary-foreground disabled:opacity-30 hover:bg-background transition-all"
                >
                    <ArrowLeft size={18} />
                    <span>Anterior</span>
                </Button>
                <div className="hidden sm:flex items-center space-x-2">
                    {sections.map((s) => (
                        <div
                            key={s.id}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeSectionId === s.id ? 'w-8 bg-indigo-600' : 'bg-secondary'}`}
                        ></div>
                    ))}
                </div>
                <Button variant="legacy" size="legacy"
                    onClick={() => {
                        if (currentIndex < sections.length - 1) setActiveSectionId(sections[currentIndex + 1].id);
                    }}
                    disabled={currentIndex >= sections.length - 1}
                    className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm disabled:opacity-30 hover:bg-primary transition-all shadow-lg"
                >
                    <span>Siguiente</span>
                    <ArrowRight size={18} />
                </Button>
            </div>
        </div>
    );
};

export default CreateCase;
