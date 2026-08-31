import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { 
    Settings as SettingsIcon, Save, RotateCcw, 
    Check, ChevronRight, Plus, Trash2, 
    Type, ListChecks, Activity, Layout as LayoutIcon,
    AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const Settings = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const { showToast } = useToast();

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.get(api.formConfig.base, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConfig(data);
            if (data.sections.length > 0) setActiveSectionId(data.sections[0].id);
        } catch (error) {
            console.error('Error fetching config:', error);
            showToast('Error al cargar la configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.formConfig.base, { sections: config.sections }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Configuración guardada con éxito', 'success');
        } catch (error) {
            console.error('Error saving config:', error);
            showToast('Error al guardar', 'error');
        }
    };

    const handleReset = async () => {
        if (!window.confirm('¿Estás seguro de resetear a los valores por defecto? Se perderán los cambios personalizados.')) return;
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.post(`${api.formConfig.base}/reset`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConfig(data);
            showToast('Configuración reseteada', 'success');
        } catch (error) {
            showToast('Error al resetear', 'error');
        }
    };

    const updateSection = (id, field, value) => {
        const newSections = config.sections.map(s => 
            s.id === id ? { ...s, [field]: value } : s
        );
        setConfig({ ...config, sections: newSections });
    };

    const handleAddItem = (sectionId) => {
        const newItem = prompt('Ingresa el nombre del nuevo elemento:');
        if (!newItem) return;
        
        const newSections = config.sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, items: [...(s.items || []), newItem] };
            }
            return s;
        });
        setConfig({ ...config, sections: newSections });
    };

    const handleRemoveItem = (sectionId, index) => {
        const newSections = config.sections.map(s => {
            if (s.id === sectionId) {
                const newItems = [...s.items];
                newItems.splice(index, 1);
                return { ...s, items: newItems };
            }
            return s;
        });
        setConfig({ ...config, sections: newSections });
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    const activeSection = config.sections.find(s => s.id === activeSectionId);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Configuración del Sistema</h2>
                    <p className="text-slate-500 font-medium">Gestiona los 13 módulos de admisión y sus contenidos.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={handleReset}
                        className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                    >
                        <RotateCcw size={18} />
                        <span>Restablecer</span>
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                    >
                        <Save size={18} />
                        <span>Guardar Cambios</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sidebar: Section List */}
                <div className="lg:col-span-4 space-y-2">
                    <div className="bg-white rounded-[24px] border border-slate-200 p-4 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Módulos del Formulario</p>
                        <div className="space-y-1">
                            {config.sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                        activeSectionId === section.id
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm'
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent'
                                    } border`}
                                >
                                    <div className="flex items-center space-x-3">
                                        {section.type === 'checklist' ? <ListChecks size={18} /> : 
                                         section.type === 'scoring' ? <Activity size={18} /> : 
                                         <LayoutIcon size={18} />}
                                        <span className="text-sm font-bold truncate">{section.title}</span>
                                    </div>
                                    {activeSectionId === section.id && <ChevronRight size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start space-x-3">
                        <AlertCircle className="text-amber-500 flex-shrink-0" size={18} />
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                            Los cambios realizados aquí afectarán a todos los nuevos casos creados a partir de ahora.
                        </p>
                    </div>
                </div>

                {/* Main: Section Editor */}
                <div className="lg:col-span-8">
                    {activeSection && (
                        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
                            <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{activeSection.title}</h3>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${activeSection.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {activeSection.enabled ? 'Habilitado' : 'Deshabilitado'}
                                        </span>
                                        <button 
                                            onClick={() => updateSection(activeSection.id, 'enabled', !activeSection.enabled)}
                                            className="text-xs font-bold text-indigo-600 hover:underline"
                                        >
                                            Cambiar estado
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descripción del Módulo</label>
                                        <input 
                                            type="text" 
                                            value={activeSection.description} 
                                            onChange={(e) => updateSection(activeSection.id, 'description', e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                {activeSection.type === 'checklist' ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Elementos del Checklist</label>
                                            <button 
                                                onClick={() => handleAddItem(activeSection.id)}
                                                className="flex items-center space-x-1.5 text-indigo-600 hover:text-indigo-700 font-bold text-xs"
                                            >
                                                <Plus size={14} />
                                                <span>Agregar Elemento</span>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {activeSection.items?.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-indigo-200 transition-colors">
                                                    <span className="text-sm font-semibold text-slate-700">{item}</span>
                                                    <button 
                                                        onClick={() => handleRemoveItem(activeSection.id, idx)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : activeSection.type === 'standard' ? (
                                    <div className="space-y-6">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Campos Definidos</label>
                                        <div className="space-y-3">
                                            {activeSection.fields?.map((field, idx) => (
                                                <div key={idx} className="flex items-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                                    <div className="p-2 bg-slate-100 rounded-lg mr-4">
                                                        {field.type === 'select' ? <ListChecks size={18} className="text-slate-500" /> : <Type size={18} className="text-slate-500" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-slate-900">{field.label}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{field.type} • {field.required ? 'Obligatorio' : 'Opcional'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-400 italic text-center mt-6">
                                            Para añadir o quitar campos estructurales, consulta con soporte técnico de LyP.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Activity size={48} className="text-slate-200 mb-4" />
                                        <p className="text-slate-500 font-medium">Este módulo utiliza una lógica especializada ({activeSection.type}).</p>
                                        <p className="text-xs text-slate-400 mt-1">El contenido se genera dinámicamente según las reglas de negocio de LyP.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
