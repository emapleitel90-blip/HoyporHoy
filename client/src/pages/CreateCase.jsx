import React, { useState, useEffect } from 'react';
import { Save, ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api, API_URL } from '../config/api';

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
            { name: 'abogadoAsignado', label: 'Abogado Responsable', type: 'text' },
            { name: 'notasInternas', label: 'Notas Administrativas', type: 'textarea', fullWidth: true },
        ]
    }
];

// ─── Dynamic field renderer ────────────────────────────────────────────────────
const DynamicField = ({ field, formData, handleChange }) => {
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
    const isEditMode = !!id;

    useEffect(() => {
        fetchFormConfig();
    }, []);

    useEffect(() => {
        if (isEditMode && sections.length > 0) fetchCaseDetails();
    }, [id, sections]);

    const fetchFormConfig = async () => {
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
    };

    const fetchCaseDetails = async () => {
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

            let parsedDetails = {};
            if (data.details) {
                parsedDetails = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
            }
            setFormData({ ...parsedDetails, clientName: data.clientName, title: data.title, description: data.description });
            if (parsedDetails.scoring) setScoring(parsedDetails.scoring);
            if (parsedDetails.customItems) setCustomItems(parsedDetails.customItems);
        } catch (err) {
            setError(err.message || 'Error cargando el caso');
        } finally {
            setLoading(false);
        }
    };

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
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{isEditMode ? 'Editar Expediente' : 'Alta de Nuevo Caso'}</h2>
                    <p className="text-slate-500 font-medium">Entrevista de admisión y clasificación jurídica LyP.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all" onClick={() => navigate('/cases')}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 disabled:opacity-50"
                    >
                        <Save size={18} />
                        <span>{saving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Finalizar Admisión')}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center space-x-3 text-red-700 animate-in shake duration-500">
                    <X className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">
                {/* Sidebar Stepper */}
                <div className="w-full md:w-72 bg-slate-50 border-r border-slate-200 overflow-y-auto">
                    <div className="p-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Módulos de Admisión</p>
                        <nav className="space-y-1.5">
                            {sections.map((section, idx) => {
                                const isActive = activeSectionId === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSectionId(section.id)}
                                        className={`w-full flex items-center text-left px-4 py-3 rounded-xl transition-all duration-300 ${isActive
                                            ? 'bg-white text-indigo-700 shadow-md ring-1 ring-slate-200 translate-x-1'
                                            : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'}`}
                                    >
                                        <span className={`w-6 h-6 flex-shrink-0 inline-flex items-center justify-center rounded-lg text-[11px] font-black mr-3 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className={`text-sm font-bold leading-tight ${isActive ? 'text-slate-900' : ''}`}>{section.title}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-10 overflow-y-auto bg-white">
                    <div className="max-w-3xl">
                        <div className="mb-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
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
                                        <label key={item} className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                                            formData[`check_${currentSection.id}_${item}`] 
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={!!(formData[`check_${currentSection.id}_${item}`])}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [`check_${currentSection.id}_${item}`]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 border-slate-300 rounded-lg focus:ring-indigo-500"
                                            />
                                            <span className={`text-sm font-bold ${formData[`check_${currentSection.id}_${item}`] ? 'text-indigo-900' : 'text-slate-600'}`}>{item}</span>
                                        </label>
                                    ))}

                                    {/* Custom items added by user */}
                                    {(customItems[currentSection.id] || []).map((item, idx) => (
                                        <div key={`custom-${idx}`} className="flex items-center space-x-3 p-4 rounded-2xl border bg-indigo-50/30 border-indigo-200 group">
                                            <input
                                                type="checkbox"
                                                checked={!!(formData[`check_${currentSection.id}_custom_${idx}`])}
                                                onChange={(e) => setFormData(prev => ({ ...prev, [`check_${currentSection.id}_custom_${idx}`]: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 border-indigo-300 rounded-lg focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-bold text-indigo-900 flex-1">{item}</span>
                                            <button 
                                                onClick={() => handleRemoveCustomItem(currentSection.id, idx)}
                                                className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    <button 
                                        onClick={() => handleAddCustomItem(currentSection.id)}
                                        className="flex items-center justify-center space-x-2 p-4 rounded-2xl border border-slate-200 border-dashed hover:bg-slate-50 hover:border-indigo-300 transition-all text-slate-400 hover:text-indigo-600"
                                    >
                                        <Plus size={18} />
                                        <span className="text-sm font-bold">Agregar Personalizado</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── SPECIAL TYPE: Scoring ── */}
                        {currentSection?.type === 'scoring' && (
                            <div className="space-y-6">
                                <SectionInfo>{currentSection.description}</SectionInfo>
                                <div className="space-y-4">
                                    {SCORING_ITEMS.map((item) => (
                                        <div key={item.key} className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                                            <div className="mb-4">
                                                <p className="font-black text-slate-900 text-sm tracking-tight">{item.label}</p>
                                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{item.desc}</p>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {['verde', 'amarillo', 'rojo'].map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => handleScoreSelect(item.key, color)}
                                                        className={`flex items-center justify-center p-3 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${scoring[item.key] === color
                                                                ? color === 'verde' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                                                                    : color === 'amarillo' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                                                                        : 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20'
                                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {color}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-10 p-8 bg-slate-900 rounded-[32px] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-900/40">
                                    <div className="text-center md:text-left mb-6 md:mb-0">
                                        <h4 className="text-xl font-black tracking-tight">Evaluación de Admisión</h4>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">{Object.keys(scoring).length} de {SCORING_ITEMS.length} métricas completadas</p>
                                    </div>
                                    <div className="text-center md:text-right">
                                        {scoreLabel ? (
                                            <>
                                                <span className={`block text-5xl font-black leading-none ${scoreLabel.color.replace('text-', 'text-indigo-400')}`}>{totalScore} pts</span>
                                                <span className={`inline-block mt-3 px-4 py-1.5 ${scoreLabel.bg} ${scoreLabel.color} rounded-full text-[10px] font-black uppercase tracking-widest`}>
                                                    {scoreLabel.label}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-slate-500 text-sm font-bold">Pendiente de evaluación</span>
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
                                    />
                                ))}
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
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => {
                        if (currentIndex > 0) setActiveSectionId(sections[currentIndex - 1].id);
                    }}
                    disabled={currentIndex <= 0}
                    className="flex items-center space-x-2 px-6 py-3 border border-slate-200 rounded-2xl font-bold text-sm text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                >
                    <ArrowLeft size={18} />
                    <span>Anterior</span>
                </button>
                <div className="hidden sm:flex items-center space-x-2">
                    {sections.map((s, idx) => (
                        <div 
                            key={s.id} 
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeSectionId === s.id ? 'w-8 bg-indigo-600' : 'bg-slate-200'}`}
                        ></div>
                    ))}
                </div>
                <button
                    onClick={() => {
                        if (currentIndex < sections.length - 1) setActiveSectionId(sections[currentIndex + 1].id);
                    }}
                    disabled={currentIndex >= sections.length - 1}
                    className="flex items-center space-x-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm disabled:opacity-30 hover:bg-slate-800 transition-all shadow-lg"
                >
                    <span>Siguiente</span>
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default CreateCase;
