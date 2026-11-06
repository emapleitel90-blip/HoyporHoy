import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
    FileText, Clock, AlertTriangle, Plus,
    TrendingUp, ArrowUpRight, Calendar,
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

const COLORS = Array.from({ length: 6 }, (_, index) => `var(--chart-${index + 1})`);

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card className="bg-card rounded-3xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>

        </div>
        <p className="text-muted-foreground text-sm font-semibold tracking-wide">{title}</p>
        <h3 className="text-3xl font-black text-foreground mt-1 tracking-tight">{value}</h3>
    </Card>
);

const EMPTY_STATS = { total: 0, open: 0, closed: 0, pending: 0, urgent: 0, byFuero: [], byStatus: [], recent: [] };

const Dashboard = () => {
    const { getToken } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
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
    }, [getToken]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Valores seguros (programación defensiva)
    const safeStats = stats || EMPTY_STATS;
    const safeByStatus = Array.isArray(safeStats.byStatus) ? safeStats.byStatus : [];
    const safeByFuero = Array.isArray(safeStats.byFuero) ? safeStats.byFuero : [];
    const safeRecent = Array.isArray(safeStats.recent) ? safeStats.recent : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-ring rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-ring border-t-transparent rounded-full animate-spin absolute top-0"></div>
                </div>
            </div>
        );
    }

    if (error && (!stats || stats.total === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
                <div className="bg-red-50 p-6 rounded-3xl border border-red-200 max-w-md text-center">
                    <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-foreground mb-2">Error de Conexión</h3>
                    <p className="text-sm text-muted-foreground font-medium mb-6">{error}</p>
                    <Button variant="legacy" size="legacy"
                        onClick={fetchStats}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        Reintentar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Top Bar / Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Tu estudio, de un vistazo</h2>
                    <p className="text-muted-foreground font-medium mt-1">Bienvenido de nuevo. Aquí está el resumen de hoy.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Card className="bg-card px-4 py-2 rounded-xl border border-border shadow-sm flex items-center space-x-2 text-sm font-bold text-secondary-foreground">
                        <Calendar size={16} className="text-link" />
                        <span>{new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</span>
                    </Card>
                    <Link
                        to="/cases/new"
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Nuevo expediente</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-flow-dense grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Casos Totales"
                    value={safeStats.total ?? 0}
                    icon={Briefcase}
                    color="bg-indigo-500"
                />
                <StatCard
                    title="En Proceso"
                    value={safeStats.open ?? 0}
                    icon={TrendingUp}
                    color="bg-emerald-500"
                />
                <StatCard
                    title="Pendientes"
                    value={safeStats.pending ?? 0}
                    icon={Clock}
                    color="bg-amber-500"
                />
                <StatCard
                    title="Urgentes"
                    value={safeStats.urgent ?? 0}
                    icon={AlertTriangle}
                    color="bg-red-500"
                />
            </div>

            {/* Charts & Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Chart */}
                <Card className="min-w-0 lg:col-span-8 bg-card rounded-[32px] p-4 sm:p-8 border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-foreground tracking-tight">Estado de los expedientes</h3>
                            <p className="text-sm text-muted-foreground font-medium">Distribución actual por estado</p>
                        </div>

                    </div>
                    <div className="h-[350px] w-full">
                        {safeByStatus.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={safeByStatus.map(s => ({ name: STATUS_LABELS[s.name] || s.name, count: s.count ?? 0 }))}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600}} dy={10} />
                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 600}} dx={-10} />
                                <Tooltip
                                    cursor={{fill: 'hsl(var(--muted))'}}
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}}
                                />
                                <Bar name="Expedientes" dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                <ActivityIcon size={48} className="mb-3 opacity-30" />
                                <p className="text-sm font-bold">Sin datos de actividad aún</p>
                                <p className="text-xs mt-1">Creá tu primer caso para ver estadísticas</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Right Column: Donut Chart / Activity */}
                <div className="min-w-0 lg:col-span-4 space-y-8">
                    <Card className="bg-card rounded-[32px] p-8 border border-border shadow-sm">
                        <h3 className="text-xl font-black text-foreground tracking-tight mb-6 text-center">Fueros</h3>
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
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Briefcase size={40} className="mb-2 opacity-30" />
                                    <p className="text-xs font-bold">Sin fueros asignados</p>
                                </div>
                            )}
                            {safeByFuero.length > 0 && <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-foreground leading-none">{safeStats.total ?? 0}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Casos</span>
                            </div>}
                        </div>
                        <div className="mt-4 space-y-2">
                            {safeByFuero.map((item, i) => (
                                <div key={i} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                        <span className="text-xs font-bold text-secondary-foreground">{item.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-foreground">{item.value ?? 0}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Recent Cases Table */}
            <Card className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
                <div className="px-4 sm:px-8 py-6 border-b border-border flex items-center justify-between bg-background/50">
                    <div>
                        <h3 className="text-xl font-black text-foreground tracking-tight">Expedientes Recientes</h3>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Los cinco ingresos más recientes</p>
                    </div>
                    <Link to="/cases" className="px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold text-link hover:bg-background transition-colors shadow-sm">
                        Ver expedientes
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <Table className="min-w-[640px] w-full text-left">
                        <TableHeader>
                            <TableRow className="bg-card text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                                <TableHead className="px-8 py-4">Consultante</TableHead>
                                <TableHead className="px-8 py-4">Fuero</TableHead>
                                <TableHead className="px-8 py-4 text-center">Estado</TableHead>
                                <TableHead className="px-8 py-4">Fecha de Ingreso</TableHead>
                                <TableHead className="px-8 py-4 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border">
                            {safeRecent.length > 0 ? safeRecent.map((item) => (
                                <TableRow key={item.id} className="hover:bg-background/80 transition-colors group">
                                    <TableCell className="px-8 py-5">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-indigo-100 group-hover:text-link transition-colors">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground leading-none">{item.clientName || item.title || 'Sin nombre'}</p>
                                                <p className="text-[11px] text-muted-foreground font-medium mt-1">ID: #{(item.id || '').slice(-6).toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-5">
                                        <span className="text-sm font-bold text-secondary-foreground">{item.fuero || '—'}</span>
                                    </TableCell>
                                    <TableCell className="px-8 py-5">
                                        <div className="flex justify-center">
                                            <Badge variant="outline" className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border-transparent ${
                                                item.status === 'OPEN' ? 'bg-emerald-50 text-status-emerald' :
                                                item.status === 'CLOSED' ? 'bg-muted text-muted-foreground' :
                                                'bg-indigo-50 text-link'
                                            }`}>
                                                {STATUS_LABELS[item.status] || item.status || '—'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-5">
                                        <span className="text-sm font-semibold text-muted-foreground">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-AR') : '—'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-8 py-5 text-right">
                                        <Link
                                            to={`/cases/${item.id}`}
                                            className="inline-flex items-center space-x-1 text-xs font-bold text-muted-foreground hover:text-link transition-colors"
                                        >
                                            <span>Detalles</span>
                                            <ArrowUpRight size={14} />
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="px-8 py-16 text-center">
                                        <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                                        <p className="text-sm font-bold text-muted-foreground">Aún no hay expedientes recientes</p>
                                        <p className="text-xs text-muted-foreground mt-1">Los casos que crees aparecerán aquí</p>
                                        <Link
                                            to="/cases/new"
                                            className="inline-flex items-center space-x-2 mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-105"
                                        >
                                            <Plus size={14} />
                                            <span>Crear primer caso</span>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
