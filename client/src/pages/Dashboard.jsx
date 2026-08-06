import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
    FileText, CheckCircle, Clock, AlertTriangle, Plus, 
    TrendingUp, ArrowUpRight, ArrowDownRight, Calendar,
    User, Briefcase, Activity as ActivityIcon
} from 'lucide-react';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
    OPEN: 'Abierto',
    CLOSED: 'Cerrado',
    IN_REVIEW: 'En Revisión',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
};

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const StatCard = ({ title, value, change, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
            {trend && (
                <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}>
                    {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{change}</span>
                </div>
            )}
        </div>
        <p className="text-slate-500 text-sm font-semibold tracking-wide">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{value}</h3>
    </div>
);

const EMPTY_STATS = { total: 0, open: 0, closed: 0, pending: 0, urgent: 0, byFuero: [], byStatus: [], recent: [] };

const Dashboard = () => {
    const { getToken } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(api.cases.list, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (!response.ok) throw new Error('Error al cargar casos');
            const data = await response.json();
            const cases = Array.isArray(data) ? data : (data.value || []);

            const total = cases.length;
            const open = cases.filter(c => c.status === 'OPEN').length;
            const closed = cases.filter(c => c.status === 'CLOSED').length;
            const pending = cases.filter(c => c.status === 'PENDING').length;
            const urgent = cases.filter(c => c.priority === 'HIGH' || (c.score && c.score > 70)).length;

            const statusCounts = {};
            cases.forEach(c => {
                const s = c.status || 'OPEN';
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            const byStatus = Object.keys(statusCounts).map(name => ({ name, count: statusCounts[name] }));

            const fueroCounts = {};
            cases.forEach(c => {
                if (c.fuero) {
                    fueroCounts[c.fuero] = (fueroCounts[c.fuero] || 0) + 1;
                }
            });
            const byFuero = Object.keys(fueroCounts).map(name => ({ name, value: fueroCounts[name] }));

            const recent = [...cases]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5)
                .map(c => ({
                    id: c.id,
                    clientName: c.clientName,
                    title: c.title,
                    fuero: c.fuero,
                    status: c.status,
                    createdAt: c.createdAt
                }));

            setStats({ total, open, closed, pending, urgent, byStatus, byFuero, recent });
        } catch (err) {
            console.error('Error cargando estadísticas:', err);
            setError('No se pudieron cargar las estadísticas.');
            setStats(EMPTY_STATS);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // Valores seguros (programación defensiva)
    const safeStats = stats || EMPTY_STATS;
    const safeByStatus = Array.isArray(safeStats.byStatus) ? safeStats.byStatus : [];
    const safeByFuero = Array.isArray(safeStats.byFuero) ? safeStats.byFuero : [];
    const safeRecent = Array.isArray(safeStats.recent) ? safeStats.recent : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                </div>
            </div>
        );
    }

    if (error && (!stats || stats.total === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="bg-red-50 p-6 rounded-3xl border border-red-200 max-w-md text-center">
                    <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-slate-900 mb-2">Error de Conexión</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6">{error}</p>
                    <button
                        onClick={fetchStats}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Top Bar / Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Panel de Control</h2>
                    <p className="text-slate-500 font-medium mt-1">Bienvenido de nuevo. Aquí está el resumen de hoy.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-2 text-sm font-bold text-slate-600">
                        <Calendar size={16} className="text-indigo-600" />
                        <span>{new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                    <Link
                        to="/cases/new"
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Nuevo Caso</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Casos Totales" 
                    value={safeStats.total ?? 0} 
                    change={safeStats.total > 0 ? `${safeStats.total}` : '—'}
                    icon={Briefcase} 
                    color="bg-indigo-500" 
                    trend={safeStats.total > 0 ? 'up' : undefined} 
                />
                <StatCard 
                    title="En Proceso" 
                    value={safeStats.open ?? 0} 
                    change={safeStats.open > 0 ? `${safeStats.open}` : '—'}
                    icon={TrendingUp} 
                    color="bg-emerald-500" 
                    trend={safeStats.open > 0 ? 'up' : undefined} 
                />
                <StatCard 
                    title="Pendientes" 
                    value={safeStats.pending ?? 0} 
                    change={safeStats.pending > 0 ? `${safeStats.pending}` : '—'}
                    icon={Clock} 
                    color="bg-amber-500" 
                    trend={safeStats.pending > 0 ? 'down' : undefined} 
                />
                <StatCard 
                    title="Urgentes" 
                    value={safeStats.urgent ?? 0} 
                    change={safeStats.urgent > 0 ? 'Crítico' : '—'}
                    icon={AlertTriangle} 
                    color="bg-red-500" 
                />
            </div>

            {/* Charts & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-8 bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Actividad de Casos</h3>
                            <p className="text-sm text-slate-500 font-medium">Distribución por estado y prioridad</p>
                        </div>
                        <div className="flex space-x-2">
                            <button className="px-4 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">Semanal</button>
                            <button className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold">Mensual</button>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        {safeByStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={safeByStatus.map(s => ({ name: STATUS_LABELS[s.name] || s.name, count: s.count ?? 0 }))}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#4F46E5" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#818CF8" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12, fontWeight: 600}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12, fontWeight: 600}} dx={-10} />
                                <Tooltip 
                                    cursor={{fill: '#F8FAFC'}} 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                                />
                                <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <ActivityIcon size={48} className="mb-3 opacity-30" />
                                <p className="text-sm font-bold">Sin datos de actividad aún</p>
                                <p className="text-xs mt-1">Creá tu primer caso para ver estadísticas</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Donut Chart / Activity */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6 text-center">Fueros</h3>
                        <div className="h-64 relative">
                            {safeByFuero.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={safeByFuero}
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {safeByFuero.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <Briefcase size={40} className="mb-2 opacity-30" />
                                    <p className="text-xs font-bold">Sin fueros asignados</p>
                                </div>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-900 leading-none">{safeStats.total ?? 0}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Casos</span>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            {safeByFuero.slice(0, 3).map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                        <span className="text-xs font-bold text-slate-600">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{item.value ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Cases Table */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Expedientes Recientes</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">Últimos movimientos detectados</p>
                    </div>
                    <Link to="/cases" className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-slate-50 transition-colors shadow-sm">
                        Ver Archivo Completo
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-4">Consultante</th>
                                <th className="px-8 py-4">Fuero</th>
                                <th className="px-8 py-4 text-center">Estado</th>
                                <th className="px-8 py-4">Fecha de Ingreso</th>
                                <th className="px-8 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {safeRecent.length > 0 ? safeRecent.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 leading-none">{item.clientName || item.title || 'Sin nombre'}</p>
                                                <p className="text-[11px] text-slate-400 font-medium mt-1">ID: #{(item.id || '').slice(-6).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-bold text-slate-600">{item.fuero || '—'}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex justify-center">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                                                item.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600' :
                                                item.status === 'CLOSED' ? 'bg-slate-100 text-slate-500' :
                                                'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                {STATUS_LABELS[item.status] || item.status || '—'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-sm font-semibold text-slate-500">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-AR') : '—'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <Link 
                                            to={`/cases/${item.id}`} 
                                            className="inline-flex items-center space-x-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <span>Detalles</span>
                                            <ArrowUpRight size={14} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-16 text-center">
                                        <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-sm font-bold text-slate-400">Aún no hay expedientes recientes</p>
                                        <p className="text-xs text-slate-300 mt-1">Los casos que crees aparecerán aquí</p>
                                        <Link
                                            to="/cases/new"
                                            className="inline-flex items-center space-x-2 mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-105"
                                        >
                                            <Plus size={14} />
                                            <span>Crear primer caso</span>
                                        </Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
