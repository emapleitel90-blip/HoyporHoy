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
    OPEN: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-700',
    IN_REVIEW: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    REJECTED: 'bg-red-100 text-red-800',
};

const FUERO_OPTIONS = ['Familia', 'Laboral', 'Civil', 'Penal', 'Comercial', 'Administrativo', 'Previsional'];

const ScoreBadge = ({ score }) => {
    if (score === null || score === undefined) return null;
    if (score <= 14) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800">{score}pts</span>;
    if (score <= 24) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">{score}pts</span>;
    return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-800">{score}pts</span>;
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
    }, [fetchCases]);

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
                    <h2 className="text-2xl font-bold text-gray-800">Gestión de Casos</h2>
                    <p className="text-gray-500">Administra todos los casos del estudio.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                        <UploadCloud className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                        Importar CSV/Excel
                    </button>
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
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm"
                            placeholder="Buscar por nombre, DNI o expediente..."
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'border-primary text-primary bg-primary/5' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Filtros
                        {hasFilters && <span className="ml-2 w-2 h-2 bg-primary rounded-full inline-block"></span>}
                    </button>
                    {hasFilters && (
                        <button onClick={clearFilters} className="flex items-center px-3 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors">
                            <X className="h-4 w-4 mr-1" /> Limpiar
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos los estados</option>
                                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Fuero</label>
                            <select
                                value={filterFuero}
                                onChange={(e) => setFilterFuero(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-primary focus:border-primary"
                            >
                                <option value="">Todos los fueros</option>
                                {FUERO_OPTIONS.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consultante</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuero</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        Cargando casos...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-red-500">{error}</td>
                                </tr>
                            ) : cases.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        <p className="font-medium">No se encontraron casos.</p>
                                        {hasFilters && <p className="text-sm mt-1">Intentá con otros filtros o <button onClick={clearFilters} className="text-primary hover:underline">limpiar búsqueda</button>.</p>}
                                        {!hasFilters && <Link to="/cases/new" className="inline-block mt-2 text-primary hover:underline text-sm font-medium">Crear el primer caso →</Link>}
                                    </td>
                                </tr>
                            ) : cases.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-9 w-9 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">
                                                {item.clientName ? item.clientName.charAt(0).toUpperCase() : 'C'}
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-semibold text-gray-900">{item.clientName || 'Sin Nombre'}</div>
                                                <div className="text-xs text-gray-400">{item.caseNumber}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {item.fuero || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-700'}`}>
                                            {STATUS_LABELS[item.status] || item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <ScoreBadge score={item.score} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(item.createdAt).toLocaleDateString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        <Link to={`/cases/${item.id}`} className="text-primary hover:text-primary-light font-medium">Ver</Link>
                                        <Link to={`/cases/${item.id}/edit`} className="text-indigo-600 hover:text-indigo-900">Editar</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && cases.length > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
                        {cases.length} caso{cases.length !== 1 ? 's' : ''} encontrado{cases.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>
            
            <DataImportModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)} 
                onImportSuccess={fetchCases} 
            />
        </div>
    );
};

export default CaseList;
