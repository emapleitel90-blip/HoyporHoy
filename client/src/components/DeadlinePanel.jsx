import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { Clock, Plus, CheckCircle, Circle } from 'lucide-react';

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` }, timeout: 15000 });
const validDeadline = (item, caseId) => item && typeof item.id === 'string' && item.caseId === caseId &&
    typeof item.title === 'string' && typeof item.isCompleted === 'boolean' && typeof item.dueDate === 'string' && Number.isFinite(Date.parse(item.dueDate));
export const DeadlinePanel = ({ caseId }) => <Deadlines key={caseId} caseId={caseId} />;
function Deadlines({ caseId }) {
    const [deadlines, setDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState('');
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const mutating = useRef(false);
    const active = useRef(true);
    const generation = useRef(0);
    const fetchDeadlines = useCallback(async () => {
        const current = ++generation.current;
        setLoading(true); setLoadError('');
        try {
            const { data } = await axios.get(api.deadlines.byCase(caseId), auth());
            if (!Array.isArray(data) || data.some(item => !validDeadline(item, caseId))) throw new Error('Respuesta inválida');
            if (active.current && current === generation.current) setDeadlines(data);
        } catch (error) {
            if (active.current && current === generation.current) setLoadError(error.response?.data?.message || 'No se pudieron cargar los vencimientos. Reintentá con Actualizar vencimientos.');
        } finally {
            if (active.current && current === generation.current) setLoading(false);
        }
    }, [caseId]);
    useEffect(() => {
        const requests = generation;
        active.current = true; fetchDeadlines();
        return () => { active.current = false; ++requests.current; };
    }, [fetchDeadlines]);
    const save = async deadline => {
        if (mutating.current || loading || loadError) return;
        const title = newTitle.trim();
        if (!deadline && (!title || title.length > 200 || !newDate)) {
            setSaveError('Ingresá una descripción de hasta 200 caracteres y una fecha.'); return;
        }
        mutating.current = true; setBusy(true); setSaveError(''); setNotice(''); ++generation.current;
        try {
            const { data } = deadline
                ? await axios.put(api.deadlines.update(deadline.id), { isCompleted: !deadline.isCompleted }, auth())
                : await axios.post(api.deadlines.create(caseId), { title, dueDate: newDate }, auth());
            if (!validDeadline(data, caseId) || (deadline && (data.id !== deadline.id || data.isCompleted !== !deadline.isCompleted)) ||
                (!deadline && (data.title !== title || data.isCompleted))) {
                throw new Error('Respuesta inválida');
            }
            notifyActivityChanged();
            if (!active.current) return;
            setDeadlines(current => [...current.filter(item => item.id !== data.id), data].sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate)));
            if (!deadline) { setNewTitle(''); setNewDate(''); }
            setNotice(deadline ? 'Estado del vencimiento actualizado.' : 'Vencimiento guardado.');
        } catch (error) {
            if (active.current) setSaveError(error.response?.data?.message || 'No se pudo confirmar el cambio. Los datos se conservan. Actualizá los vencimientos antes de reintentar para comprobar si se guardó.');
        } finally {
            mutating.current = false;
            if (active.current) setBusy(false);
        }
    };
    const handleAdd = event => { event.preventDefault(); save(null); };
    const toggleStatus = deadline => save(deadline);

    return (
        <Card className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-link" />
                    <h3 className="text-base font-semibold text-foreground">Agenda de Vencimientos</h3>
                </div>
            </div>
            <div className="p-6">
                <Button variant="legacy" size="legacy" type="button" disabled={busy || loading} onClick={fetchDeadlines} className="underline mb-3">Actualizar vencimientos</Button>
                {loadError && <p role="alert" className="text-status-red mb-3">{loadError}</p>}
                {saveError && <p role="alert" className="text-status-red mb-3">{saveError}</p>}
                {notice && <p role="status" className="text-status-green mb-3">{notice}</p>}
                <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
                    <Input
                        type="text"
                        placeholder="Descripción del plazo..."
                        aria-label="Descripción del vencimiento" maxLength={200} disabled={busy || loading || !!loadError}
                        className="flex-1 border-border rounded-lg text-sm"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                    />
                    <Input
                        type="date"
                        aria-label="Fecha del vencimiento" disabled={busy || loading || !!loadError}
                        className="border-border rounded-lg text-sm"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        required
                    />
                    <Button variant="legacy" size="legacy" disabled={busy || loading || !!loadError} type="submit" className="bg-primary text-white p-2 text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1">
                        <Plus className="w-4 h-4"/> Añadir
                    </Button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {loading ? <p role="status">Cargando plazos...</p> : loadError ? null : deadlines.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No hay plazos registrados.</p>
                    ) : (
                        deadlines.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <Button variant="legacy" size="legacy" type="button" disabled={busy || loading} aria-label={`${d.isCompleted ? 'Reabrir' : 'Completar'} vencimiento: ${d.title}`} onClick={() => toggleStatus(d)} className="text-muted-foreground hover:text-link transition-colors cursor-pointer">
                                        {d.isCompleted ? <CheckCircle className="w-5 h-5 text-status-green" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                                    </Button>
                                    <div>
                                        <p className={`text-sm font-medium ${d.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                            {d.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Vence: {new Date(d.dueDate).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Card>
    );
}
