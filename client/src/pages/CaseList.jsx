import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, X, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataImportModal } from '../components/DataImportModal';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
    OPEN: 'Abierto',
    CLOSED: 'Cerrado',
    IN_REVIEW: 'En Revisión',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
};

const STATUS_COLORS = {
    OPEN: 'bg-green-100 text-status-green',
    CLOSED: 'bg-muted text-foreground',
    IN_REVIEW: 'bg-blue-100 text-link',
    PENDING: 'bg-yellow-100 text-status-yellow',
    REJECTED: 'bg-red-100 text-status-red',
};

const FUERO_OPTIONS = ['Familia', 'Laboral', 'Civil', 'Penal', 'Comercial', 'Administrativo', 'Previsional'];

const ScoreBadge = ({ score }) => {
    if (score === null || score === undefined) return null;
    if (score <= 14) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-status-green">{score}pts</span>;
    if (score <= 24) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-status-yellow">{score}pts</span>;
    return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-status-red">{score}pts</span>;
};

const CaseList = () => {
    const { getToken } = useAuth();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFuero, setFilterFuero] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const fetchCases = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (filterFuero) params.append('fuero', filterFuero);
            if (search) params.append('search', search);

            const url = `${api.cases.list}${params.toString() ? '?' + params.toString() : ''}`;
            const response = await fetch(url, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (!response.ok) throw new Error('Error al cargar casos');
            const result = await response.json();
            const data = Array.isArray(result) ? result : result.value || [];

            const mappedCases = data.map(c => ({
                id: c.id,
                clientName: c.clientName || (c.client ? `${c.client.firstName} ${c.client.lastName}` : null),
                caseNumber: c.caseNumber,
                title: c.title,
                fuero: c.fuero,
                status: c.status,
                score: c.score,
                createdAt: c.createdAt
            }));

            setCases(mappedCases);
        } catch (err) {
            setError('Error al cargar los casos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, filterFuero, getToken]);

    useEffect(() => {
        const timeout = setTimeout(() => { fetchCases(); }, search ? 400 : 0);
        return () => clearTimeout(timeout);
    }, [fetchCases, search]);

    const clearFilters = () => {
        setSearch('');
        setFilterStatus('');
        setFilterFuero('');
    };

    const hasFilters = search || filterStatus || filterFuero;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Gestión de Casos</h2>
                    <p className="text-muted-foreground">Administra todos los casos del estudio.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="legacy" size="legacy"
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-border rounded-lg shadow-sm text-sm font-medium text-foreground bg-card hover:bg-background transition-colors"
                    >
                        <UploadCloud className="-ml-1 mr-2 h-5 w-5 text-muted-foreground" />
                        Importar CSV/Excel
                    </Button>
                    <Link
                        to="/cases/new"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-light transition-colors"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                        Nuevo Caso
                    </Link>
                </div>
            </div>

            {/* Search + Filter Bar */}
            <Card className="bg-card rounded-xl shadow-sm p-4 border border-border space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary text-sm"
                            aria-label="Buscar expedientes" placeholder="Buscar por nombre, DNI o expediente..."
                        />
                    </div>
                    <Button variant="legacy" size="legacy"
                        aria-expanded={showFilters} onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'border-primary text-link bg-primary/5' : 'border-border text-foreground bg-card hover:bg-background'}`}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Filtros
                        {hasFilters && <span className="ml-2 w-2 h-2 bg-primary rounded-full inline-block"></span>}
                    </Button>
                    {hasFilters && (
                        <Button variant="legacy" size="legacy" onClick={clearFilters} className="flex items-center px-3 py-2 text-sm text-muted-foreground hover:text-status-red transition-colors">
                            <X className="h-4 w-4 mr-1" /> Limpiar
                        </Button>
                    )}
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border">
                        <div>
                            <Label className="block text-xs font-medium text-muted-foreground mb-1">Estado</Label>
                            <NativeSelect
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full border border-border rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos los estados</option>
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </NativeSelect>
                        </div>
                        <div>
                            <Label className="block text-xs font-medium text-muted-foreground mb-1">Fuero</Label>
                            <NativeSelect
                                value={filterFuero}
                                onChange={(e) => setFilterFuero(e.target.value)}
                                className="w-full border border-border rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos los fueros</option>
                                {FUERO_OPTIONS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </NativeSelect>
                        </div>
                    </div>
                )}
            </Card>

            {/* Table */}
            <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-full divide-y divide-border">
                        <TableHeader className="bg-background">
                            <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Consultante</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fuero</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</TableHead>
                                <TableHead className="relative px-6 py-3"><span className="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-card divide-y divide-border">
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        Cargando casos...
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan="6" className="px-6 py-8 text-center text-status-red">{error}</TableCell>
                                </TableRow>
                            ) : cases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan="6" className="px-6 py-12 text-center text-muted-foreground">
                                        <p className="font-medium">No se encontraron casos.</p>
                                        {hasFilters && <p className="text-sm mt-1">Intentá con otros filtros o <Button variant="legacy" size="legacy" onClick={clearFilters} className="text-link hover:underline">limpiar búsqueda</Button>.</p>}
                                        {!hasFilters && <Link to="/cases/new" className="inline-block mt-2 text-link hover:underline text-sm font-medium">Crear el primer caso →</Link>}
                                    </TableCell>
                                </TableRow>
                            ) : cases.map((item) => (
                                <TableRow key={item.id} className="hover:bg-background transition-colors">
                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-9 w-9 bg-secondary rounded-full flex items-center justify-center font-bold text-secondary-foreground text-sm">
                                                {item.clientName ? item.clientName.charAt(0).toUpperCase() : 'C'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-semibold text-foreground">{item.clientName || 'Sin Nombre'}</div>
                                                <div className="text-xs text-muted-foreground">{item.caseNumber}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-secondary-foreground">
                                        {item.fuero || '—'}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant="outline" className={`px-2 py-1 text-xs leading-5 font-semibold rounded-md border-transparent ${STATUS_COLORS[item.status] || 'bg-muted text-foreground'}`}>
                                            {STATUS_LABELS[item.status] || item.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                        <ScoreBadge score={item.score} />
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {new Date(item.createdAt).toLocaleDateString('es-AR')}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        <Link to={`/cases/${item.id}`} className="text-link hover:text-primary-light font-medium">Ver</Link>
                                        <Link to={`/cases/${item.id}/edit`} className="text-link hover:text-link">Editar</Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {!loading && cases.length > 0 && (
                    <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground">
                        {cases.length} caso{cases.length !== 1 ? 's' : ''} encontrado{cases.length !== 1 ? 's' : ''}
                    </div>
                )}
            </Card>

            <DataImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={fetchCases}
            />
        </div>
    );
};

export default CaseList;
