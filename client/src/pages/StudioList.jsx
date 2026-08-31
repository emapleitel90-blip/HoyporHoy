import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Building2, Users, Briefcase, Plus, AlertCircle,
    CheckCircle2, XCircle, Search, Power, ArrowUpRight,
    ChevronRight, Mail, Hash, ShieldCheck
} from 'lucide-react';
import { api, API_URL } from '../config/api';
import { useToast } from '../context/ToastContext';

const StudioList = () => {
    const [studios, setStudios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        cuit: '',
        email: '',
        packagePlan: 'BASIC'
    });

    const [newCredentials, setNewCredentials] = useState(null);

    useEffect(() => {
        fetchStudios();
    }, []);

    const fetchStudios = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.get(api.studios.list, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudios(data);
        } catch (err) {
            showToast('Error al cargar estudios', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStudio = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const token = localStorage.getItem('lyp_token');
            const { data } = await axios.post(api.studios.list, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setNewCredentials({
                adminEmail: data.adminEmail,
                password: data.defaultPassword,
                studioName: data.studio.name
            });

            setFormData({ name: '', cuit: '', email: '', packagePlan: 'BASIC' });
            fetchStudios();
            showToast('Estudio creado con éxito', 'success');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al crear inquilino');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('lyp_token');
            const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
            await axios.put(`${api.studios.list}/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchStudios();
            showToast('Estado actualizado', 'success');
        } catch (err) {
            showToast('Error al cambiar estado', 'error');
        }
    };

    const filteredStudios = studios.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.cuit.includes(search)
    );

    const totalStudios = studios.length;
    const activeStudios = studios.filter(s => s.status === 'ACTIVE').length;
    const totalUsers = studios.reduce((acc, s) => acc + (s._count?.users || 0), 0);
    const totalCases = studios.reduce((acc, s) => acc + (s._count?.cases || 0), 0);

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Gestión SaaS LyP</h2>
                    <p className="text-slate-500 font-medium mt-1">Administración centralizada de estudios jurídicos externos.</p>
                </div>
                <button
                    onClick={() => { setIsModalOpen(true); setNewCredentials(null); setError(''); }}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                >
                    <Plus size={20} />
                    <span>Nuevo Cliente Jurídico</span>
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="p-3 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mb-4 flex items-center justify-center">
                        <Building2 size={24} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Estudios Totales</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{totalStudios}</h3>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="p-3 w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl mb-4 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Suscripciones Activas</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{activeStudios}</h3>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="p-3 w-12 h-12 bg-purple-50 text-purple-600 rounded-xl mb-4 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Usuarios Globales</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{totalUsers}</h3>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="p-3 w-12 h-12 bg-amber-50 text-amber-600 rounded-xl mb-4 flex items-center justify-center">
                        <Briefcase size={24} />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Expedientes Totales</p>
                    <h3 className="text-3xl font-black text-slate-900 mt-1">{totalCases}</h3>
                </div>
            </div>

            {/* List & Search */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o CUIT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Estudio Jurídico</th>
                                <th className="px-8 py-5">Identificación</th>
                                <th className="px-8 py-5 text-center">Plan</th>
                                <th className="px-8 py-5 text-center">Métricas</th>
                                <th className="px-8 py-5 text-center">Estado</th>
                                <th className="px-8 py-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudios.map((studio) => (
                                <tr key={studio.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 leading-none">{studio.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Alta: {new Date(studio.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                <Hash size={12} className="mr-1.5 text-slate-400" />
                                                {studio.cuit}
                                            </div>
                                            <div className="flex items-center text-[10px] font-medium text-slate-400">
                                                <Mail size={12} className="mr-1.5 text-slate-300" />
                                                {studio.adminEmail || 'No email'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            studio.package === 'ELITE' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                            studio.package === 'PRO' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                            'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                            {studio.package}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-center space-x-4">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-slate-900 leading-none">{studio._count?.users || 0}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Usuarios</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-slate-900 leading-none">{studio._count?.cases || 0}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Casos</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            studio.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}>
                                            {studio.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => toggleStatus(studio.id, studio.status)}
                                            className={`p-2 rounded-xl transition-all ${
                                                studio.status === 'ACTIVE' ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'
                                            }`}
                                        >
                                            <Power size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {newCredentials ? (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-600/10">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">¡Acceso Generado!</h3>
                                <p className="text-slate-500 text-sm font-medium mb-8">Credenciales de seguridad para el nuevo inquilino LyP.</p>
                                
                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left space-y-4 mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estudio</p>
                                        <p className="text-sm font-bold text-slate-900">{newCredentials.studioName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Administrador</p>
                                        <p className="text-sm font-bold text-indigo-600 underline">{newCredentials.adminEmail}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contraseña Temporal</p>
                                        <p className="text-sm font-mono font-black text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-block">{newCredentials.password}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                                >
                                    Cerrar y Finalizar
                                </button>
                            </div>
                        ) : (
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Inquilino SaaS</h3>
                                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle size={24} /></button>
                                </div>
                                
                                <form onSubmit={handleCreateStudio} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Estudio</label>
                                        <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CUIT (Solo números)</label>
                                            <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={formData.cuit} onChange={e => setFormData({ ...formData, cuit: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan de Suscripción</label>
                                            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer" value={formData.packagePlan} onChange={e => setFormData({ ...formData, packagePlan: e.target.value })}>
                                                <option value="BASIC">Básico (Lite)</option>
                                                <option value="PRO">Profesional (Adv)</option>
                                                <option value="ELITE">Élite (Socio)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Contacto Admin</label>
                                        <input required type="email" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    
                                    {error && <p className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
                                    
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-4"
                                    >
                                        {loading ? 'Procesando alta...' : 'Registrar y Generar Credenciales'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudioList;
