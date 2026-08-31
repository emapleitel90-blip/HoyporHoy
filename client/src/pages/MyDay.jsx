import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { api } from '../config/api';
import { useToast } from '../context/ToastContext';
import {
    AlertTriangle,
    Clock,
    CalendarDays,
    CheckCircle,
    Eye,
    Loader2,
    Inbox,
    RefreshCw,
} from 'lucide-react';

const MyDay = () => {
    const [data, setData] = useState({ overdue: [], today: [], upcoming: [], counts: { overdue: 0, today: 0, upcoming: 0, total: 0 } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [completingId, setCompletingId] = useState(null);
    const navigate = useNavigate();
    const { showToast } = useToast();

    const fetchMyDay = useCallback(async () => {
        try {
            setError(null);
            const token = localStorage.getItem('lyp_token');
            const { data: result } = await axios.get(api.deadlines.myDay, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(result);
        } catch (err) {
            console.error('Error cargando Mi jornada:', err);
            setError('No se pudo cargar la información de tu jornada. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyDay();
    }, [fetchMyDay]);

    const handleComplete = async (deadlineId) => {
        setCompletingId(deadlineId);
        try {
            const token = localStorage.getItem('lyp_token');
            await axios.put(api.deadlines.update(deadlineId), {
                isCompleted: true,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast('Vencimiento marcado como cumplido', 'success');
            // Actualizar la pantalla sin recargar toda la página
            await fetchMyDay();
        } catch (err) {
            console.error('Error al completar vencimiento:', err);
            showToast('Error al marcar como cumplido. Verificá tus permisos.', 'error');
        } finally {
            setCompletingId(null);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-AR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // --- Componente interno: Tarjeta de vencimiento ---
    const DeadlineCard = ({ deadline, variant }) => {
        const isCompleting = completingId === deadline.id;

        const variantStyles = {
            overdue: 'border-l-4 border-l-red-500 bg-red-50/50',
            today: 'border-l-4 border-l-amber-500 bg-amber-50/50',
            upcoming: 'border-l-4 border-l-blue-500 bg-blue-50/50',
        };

        return (
            <div className={`rounded-xl p-4 transition-all duration-200 hover:shadow-md ${variantStyles[variant]} border border-slate-200/60`}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 truncate">{deadline.title}</h4>
                        <div className="mt-1.5 space-y-1">
                            <p className="text-xs text-slate-600">
                                <span className="font-semibold">Expediente:</span>{' '}
                                {deadline.caseNumber || 'Sin número'} — {deadline.caseTitle || 'Sin carátula'}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <p className="text-xs text-slate-500">
                                    <span className="font-medium">Fecha:</span> {formatDate(deadline.dueDate)} · {formatTime(deadline.dueDate)}
                                </p>
                                {deadline.fuero && (
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">Fuero:</span> {deadline.fuero}
                                    </p>
                                )}
                                {deadline.assignedLawyer && (
                                    <p className="text-xs text-slate-500">
                                        <span className="font-medium">Abogado:</span> {deadline.assignedLawyer}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={() => navigate(`/cases/${deadline.caseId}`)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Ver expediente"
                        >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Ver</span>
                        </button>
                        <button
                            onClick={() => handleComplete(deadline.id)}
                            disabled={isCompleting}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                                isCompleting
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'text-green-700 bg-green-50 hover:bg-green-100'
                            }`}
                            title="Marcar como cumplido"
                        >
                            {isCompleting ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <CheckCircle size={14} />
                            )}
                            <span className="hidden sm:inline">{isCompleting ? 'Guardando...' : 'Cumplido'}</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Componente interno: Sección ---
    const Section = ({ title, icon: Icon, iconColor, count, items, variant, emptyText }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
                        <Icon size={16} className="text-white" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    count > 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                    {count}
                </span>
            </div>
            <div className="p-4 space-y-3">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Inbox size={32} className="mb-2 opacity-50" />
                        <p className="text-sm font-medium">{emptyText}</p>
                    </div>
                ) : (
                    items.map((d) => <DeadlineCard key={d.id} deadline={d} variant={variant} />)
                )}
            </div>
        </div>
    );

    // --- Estados de carga y error ---
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="text-base font-medium">Cargando tu jornada...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <AlertTriangle size={40} className="mb-4 text-red-400" />
                <p className="text-base font-medium mb-4">{error}</p>
                <button
                    onClick={() => { setLoading(true); fetchMyDay(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    <RefreshCw size={14} />
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mi jornada</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Vencimientos que requieren tu atención — {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchMyDay(); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <RefreshCw size={14} />
                    Actualizar
                </button>
            </div>

            {/* Resumen rápido */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="bg-red-50 border border-red-200/60 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                        <AlertTriangle size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-red-700">{data.counts.overdue}</p>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Vencidos</p>
                    </div>
                </div>
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                        <Clock size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-amber-700">{data.counts.today}</p>
                        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Hoy</p>
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <CalendarDays size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-blue-700">{data.counts.upcoming}</p>
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Próximos 7 días</p>
                    </div>
                </div>
            </div>

            {/* Secciones de vencimientos */}
            <div className="space-y-6">
                <Section
                    title="Vencidos"
                    icon={AlertTriangle}
                    iconColor="bg-red-500"
                    count={data.counts.overdue}
                    items={data.overdue}
                    variant="overdue"
                    emptyText="No hay vencimientos atrasados. ¡Bien!"
                />
                <Section
                    title="Hoy"
                    icon={Clock}
                    iconColor="bg-amber-500"
                    count={data.counts.today}
                    items={data.today}
                    variant="today"
                    emptyText="No hay vencimientos para hoy."
                />
                <Section
                    title="Próximos 7 días"
                    icon={CalendarDays}
                    iconColor="bg-blue-500"
                    count={data.counts.upcoming}
                    items={data.upcoming}
                    variant="upcoming"
                    emptyText="No hay vencimientos en los próximos 7 días."
                />
            </div>
        </div>
    );
};

export default MyDay;
