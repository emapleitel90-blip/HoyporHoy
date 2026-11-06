import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Building2, Users, Briefcase, Plus,
    CheckCircle2, XCircle, Search, Power,
    Mail, Hash, ShieldCheck
} from 'lucide-react';
import { api } from '../config/api';
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

    const fetchStudios = useCallback(async () => {
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
    }, [showToast]);

    useEffect(() => {
        fetchStudios();
    }, [fetchStudios]);

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
                    <h2 className="text-3xl font-black text-foreground tracking-tighter">Gestión SaaS LyP</h2>
                    <p className="text-muted-foreground font-medium mt-1">Administración centralizada de estudios jurídicos externos.</p>
                </div>
                <Button variant="legacy" size="legacy"
                    onClick={() => { setIsModalOpen(true); setNewCredentials(null); setError(''); }}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
                >
                    <Plus size={20} />
                    <span>Nuevo Cliente Jurídico</span>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-card rounded-3xl p-6 border border-border shadow-sm">
                    <div className="p-3 w-12 h-12 bg-indigo-50 text-link rounded-xl mb-4 flex items-center justify-center">
                        <Building2 size={24} />
                    </div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Estudios Totales</p>
                    <h3 className="text-3xl font-black text-foreground mt-1">{totalStudios}</h3>
                </Card>
                <Card className="bg-card rounded-3xl p-6 border border-border shadow-sm">
                    <div className="p-3 w-12 h-12 bg-emerald-50 text-status-emerald rounded-xl mb-4 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Suscripciones Activas</p>
                    <h3 className="text-3xl font-black text-foreground mt-1">{activeStudios}</h3>
                </Card>
                <Card className="bg-card rounded-3xl p-6 border border-border shadow-sm">
                    <div className="p-3 w-12 h-12 bg-purple-50 text-status-purple rounded-xl mb-4 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Usuarios Globales</p>
                    <h3 className="text-3xl font-black text-foreground mt-1">{totalUsers}</h3>
                </Card>
                <Card className="bg-card rounded-3xl p-6 border border-border shadow-sm">
                    <div className="p-3 w-12 h-12 bg-amber-50 text-status-amber rounded-xl mb-4 flex items-center justify-center">
                        <Briefcase size={24} />
                    </div>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Expedientes Totales</p>
                    <h3 className="text-3xl font-black text-foreground mt-1">{totalCases}</h3>
                </Card>
            </div>

            {/* List & Search */}
            <Card className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
                <div className="p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/30">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre o CUIT..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-ring/10 focus:border-ring outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table className="w-full text-left">
                        <TableHeader>
                            <TableRow className="bg-card text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                <TableHead className="px-8 py-5">Estudio Jurídico</TableHead>
                                <TableHead className="px-8 py-5">Identificación</TableHead>
                                <TableHead className="px-8 py-5 text-center">Plan</TableHead>
                                <TableHead className="px-8 py-5 text-center">Métricas</TableHead>
                                <TableHead className="px-8 py-5 text-center">Estado</TableHead>
                                <TableHead className="px-8 py-5 text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border">
                            {filteredStudios.map((studio) => (
                                <TableRow key={studio.id} className="hover:bg-background/50 transition-colors group">
                                    <TableCell className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-indigo-100 group-hover:text-link transition-all">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground leading-none">{studio.name}</p>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Alta: {new Date(studio.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6">
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex items-center text-xs font-bold text-secondary-foreground">
                                                <Hash size={12} className="mr-1.5 text-muted-foreground" />
                                                {studio.cuit}
                                            </div>
                                            <div className="flex items-center text-[10px] font-medium text-muted-foreground">
                                                <Mail size={12} className="mr-1.5 text-muted-foreground" />
                                                {studio.adminEmail || 'No email'}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            studio.package === 'ELITE' ? 'bg-purple-50 text-status-purple border-purple-100' :
                                            studio.package === 'PRO' ? 'bg-indigo-50 text-link border-ring' :
                                            'bg-background text-secondary-foreground border-border'
                                        }`}>
                                            {studio.package}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-8 py-6">
                                        <div className="flex items-center justify-center space-x-4">
                                            <div className="text-center">
                                                <p className="text-xs font-black text-foreground leading-none">{studio._count?.users || 0}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Usuarios</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs font-black text-foreground leading-none">{studio._count?.cases || 0}</p>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Casos</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            studio.status === 'ACTIVE' ? 'bg-emerald-50 text-status-emerald' : 'bg-red-50 text-status-red'
                                        }`}>
                                            {studio.status === 'ACTIVE' ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-8 py-6 text-right">
                                        <Button variant="legacy" size="legacy"
                                            onClick={() => toggleStatus(studio.id, studio.status)}
                                            className={`p-2 rounded-xl transition-all ${
                                                studio.status === 'ACTIVE' ? 'text-muted-foreground hover:text-status-red hover:bg-red-50' : 'text-status-emerald hover:bg-emerald-50'
                                            }`}
                                        >
                                            <Power size={20} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {newCredentials ? (
                            <div className="p-10 text-center">
                                <div className="w-16 h-16 bg-emerald-100 text-status-emerald rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-600/10">
                                    <ShieldCheck size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-foreground tracking-tight mb-2">¡Acceso Generado!</h3>
                                <p className="text-muted-foreground text-sm font-medium mb-8">Credenciales de seguridad para el nuevo inquilino LyP.</p>

                                <div className="bg-background rounded-2xl p-6 border border-border text-left space-y-4 mb-8">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Estudio</p>
                                        <p className="text-sm font-bold text-foreground">{newCredentials.studioName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Email Administrador</p>
                                        <p className="text-sm font-bold text-link underline">{newCredentials.adminEmail}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Contraseña Temporal</p>
                                        <p className="text-sm font-mono font-black text-foreground bg-card px-3 py-1.5 rounded-lg border border-border inline-block">{newCredentials.password}</p>
                                    </div>
                                </div>

                                <Button variant="legacy" size="legacy"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary transition-all shadow-lg"
                                >
                                    Cerrar y Finalizar
                                </Button>
                            </div>
                        ) : (
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-black text-foreground tracking-tight">Nuevo Inquilino SaaS</h3>
                                    <Button variant="legacy" size="legacy" onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-secondary-foreground transition-colors"><XCircle size={24} /></Button>
                                </div>

                                <form onSubmit={handleCreateStudio} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nombre del Estudio</Label>
                                        <Input required type="text" className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-bold focus:ring-4 focus:ring-ring/10 focus:border-ring outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">CUIT (Solo números)</Label>
                                            <Input required type="text" className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-bold focus:ring-4 focus:ring-ring/10 focus:border-ring outline-none transition-all" value={formData.cuit} onChange={e => setFormData({ ...formData, cuit: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Plan de Suscripción</Label>
                                            <NativeSelect className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-bold focus:ring-4 focus:ring-ring/10 focus:border-ring outline-none transition-all appearance-none cursor-pointer" value={formData.packagePlan} onChange={e => setFormData({ ...formData, packagePlan: e.target.value })}>
                                                <option value="BASIC">Básico (Lite)</option>
                                                <option value="PRO">Profesional (Adv)</option>
                                                <option value="ELITE">Élite (Socio)</option>
                                            </NativeSelect>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email de Contacto Admin</Label>
                                        <Input required type="email" className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm font-bold focus:ring-4 focus:ring-ring/10 focus:border-ring outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>

                                    {error && <p className="text-xs font-bold text-status-red bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

                                    <Button variant="legacy" size="legacy"
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-4"
                                    >
                                        {loading ? 'Procesando alta...' : 'Registrar y Generar Credenciales'}
                                    </Button>
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
