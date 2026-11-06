import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import {
    Save, RotateCcw,
    ChevronRight, Plus, Trash2,
    Type, ListChecks, Activity, Layout as LayoutIcon,
    AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

const readConfig = data => {
    if (!data || !Array.isArray(data.sections) || !data.sections.every(section =>
        section && typeof section.id === 'string' && section.id.length > 0 &&
        typeof section.title === 'string' && typeof section.type === 'string' &&
        typeof section.enabled === 'boolean' &&
        (section.description === undefined || typeof section.description === 'string') &&
        (section.items === undefined || (Array.isArray(section.items) && section.items.every(item => typeof item === 'string'))) &&
        (section.fields === undefined || (Array.isArray(section.fields) && section.fields.every(field =>
            field && typeof field.label === 'string' && typeof field.type === 'string')))
    ) || new Set(data.sections.map(section => section.id)).size !== data.sections.length) {
        throw new Error('Respuesta de configuración inválida');
    }
    return data;
};

const Settings = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const { showToast } = useToast();

    const fetchConfig = useCallback(async (signal) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.get(api.formConfig.base, {
                headers: { Authorization: `Bearer ${token}` }, signal,
            });
            if (signal?.aborted) return;
            const config = readConfig(data);
            setConfig(config);
            setActiveSectionId(config.sections[0]?.id ?? null);
        } catch (error) {
            if (signal?.aborted) return;
            console.error('Error fetching config:', error);
            setError('No se pudo cargar la configuración. Intentá de nuevo.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchConfig(controller.signal);
        return () => controller.abort();
    }, [fetchConfig]);

    const handleSave = async () => {
        if (!config || busy) return;
        setBusy(true);
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.formConfig.base, { sections: config.sections }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Configuración guardada con éxito', 'success');
        } catch (error) {
            console.error('Error saving config:', error);
            showToast('Error al guardar', 'error');
        } finally {
            setBusy(false);
        }
    };

    const handleReset = async () => {
        if (busy) return;
        if (!window.confirm('¿Estás seguro de resetear a los valores por defecto? Se perderán los cambios personalizados.')) return;
        setBusy(true);
        try {
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.post(`${api.formConfig.base}/reset`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const config = readConfig(data);
            setConfig(config);
            setActiveSectionId(current => config.sections.some(section => section.id === current)
                ? current : config.sections[0]?.id ?? null);
            showToast('Configuración reseteada', 'success');
        } catch (error) {
            showToast('Error al resetear', 'error');
        } finally {
            setBusy(false);
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
        <div role="status" aria-label="Cargando configuración" className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ring"></div>
        </div>
    );

    if (error || !config) return (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">Configuración del Sistema</h2>
            <p className="text-status-red">{error || 'La configuración no está disponible.'}</p>
            <Button variant="legacy" size="legacy" onClick={() => fetchConfig()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold">
                Reintentar
            </Button>
        </div>
    );

    const activeSection = config.sections.find(s => s.id === activeSectionId);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Configuración del Sistema</h2>
                    <p className="text-muted-foreground font-medium">Gestiona los 13 módulos de admisión y sus contenidos.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="legacy" size="legacy"
                        onClick={handleReset}
                        disabled={busy}
                        className="flex items-center space-x-2 bg-card border border-border text-secondary-foreground px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-background transition-all"
                    >
                        <RotateCcw size={18} />
                        <span>Restablecer</span>
                    </Button>
                    <Button variant="legacy" size="legacy"
                        onClick={handleSave}
                        disabled={busy}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                    >
                        <Save size={18} />
                        <span>Guardar Cambios</span>
                    </Button>
                </div>
            </div>

            {config.sections.length === 0 && (
                <p role="status" className="text-secondary-foreground">No hay módulos configurados. Podés restablecer los valores por defecto.</p>
            )}

            <fieldset disabled={busy} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sidebar: Section List */}
                <div className="lg:col-span-4 space-y-2">
                    <Card className="bg-card rounded-[24px] border border-border p-4 shadow-sm">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 px-2">Módulos del Formulario</p>
                        <div className="space-y-1">
                            {config.sections.map((section) => (
                                <Button variant="legacy" size="legacy"
                                    key={section.id}
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                                        activeSectionId === section.id
                                            ? 'bg-indigo-50 text-link border-ring shadow-sm'
                                            : 'text-muted-foreground hover:bg-background hover:text-foreground border-transparent'
                                    } border`}
                                >
                                    <div className="flex items-center space-x-3">
                                        {section.type === 'checklist' ? <ListChecks size={18} /> :
                                         section.type === 'scoring' ? <Activity size={18} /> :
                                         <LayoutIcon size={18} />}
                                        <span className="text-sm font-bold truncate">{section.title}</span>
                                    </div>
                                    {activeSectionId === section.id && <ChevronRight size={14} />}
                                </Button>
                            ))}
                        </div>
                    </Card>

                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start space-x-3">
                        <AlertCircle className="text-status-amber flex-shrink-0" size={18} />
                        <p className="text-xs text-status-amber font-medium leading-relaxed">
                            Los cambios realizados aquí afectarán a todos los nuevos casos creados a partir de ahora.
                        </p>
                    </div>
                </div>

                {/* Main: Section Editor */}
                <div className="lg:col-span-8">
                    {activeSection && (
                        <Card className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
                            <div className="p-8 border-b border-border bg-background/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-2xl font-black text-foreground tracking-tight">{activeSection.title}</h3>
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${activeSection.enabled ? 'bg-emerald-50 text-status-emerald' : 'bg-muted text-muted-foreground'}`}>
                                            {activeSection.enabled ? 'Habilitado' : 'Deshabilitado'}
                                        </span>
                                        <Button variant="legacy" size="legacy"
                                            onClick={() => updateSection(activeSection.id, 'enabled', !activeSection.enabled)}
                                            className="text-xs font-bold text-link hover:underline"
                                        >
                                            Cambiar estado
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Descripción del Módulo</Label>
                                        <Input
                                            type="text"
                                            value={activeSection.description || ''}
                                            onChange={(e) => updateSection(activeSection.id, 'description', e.target.value)}
                                            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-ring focus:border-ring transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                {activeSection.type === 'checklist' ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <Label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Elementos del Checklist</Label>
                                            <Button variant="legacy" size="legacy"
                                                onClick={() => handleAddItem(activeSection.id)}
                                                className="flex items-center space-x-1.5 text-link hover:text-link font-bold text-xs"
                                            >
                                                <Plus size={14} />
                                                <span>Agregar Elemento</span>
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {activeSection.items?.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl group hover:border-ring transition-colors">
                                                    <span className="text-sm font-semibold text-foreground">{item}</span>
                                                    <Button variant="legacy" size="legacy"
                                                        onClick={() => handleRemoveItem(activeSection.id, idx)}
                                                        className="text-muted-foreground hover:text-status-red transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : activeSection.type === 'standard' ? (
                                    <div className="space-y-6">
                                        <Label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Campos Definidos</Label>
                                        <div className="space-y-3">
                                            {activeSection.fields?.map((field, idx) => (
                                                <Card key={idx} className="flex items-center p-4 bg-card border border-border rounded-2xl shadow-sm">
                                                    <div className="p-2 bg-muted rounded-lg mr-4">
                                                        {field.type === 'select' ? <ListChecks size={18} className="text-muted-foreground" /> : <Type size={18} className="text-muted-foreground" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-foreground">{field.label}</p>
                                                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{field.type} • {field.required ? 'Obligatorio' : 'Opcional'}</p>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground italic text-center mt-6">
                                            Para añadir o quitar campos estructurales, consulta con soporte técnico de LyP.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Activity size={48} className="text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground font-medium">Este módulo utiliza una lógica especializada ({activeSection.type}).</p>
                                        <p className="text-xs text-muted-foreground mt-1">El contenido se genera dinámicamente según las reglas de negocio de LyP.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>
            </fieldset>
        </div>
    );
};

export default Settings;
