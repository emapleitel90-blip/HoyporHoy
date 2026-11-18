import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowRight, CalendarDays, CheckCircle2, User } from 'lucide-react';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { dayKey, fullDay } from '../utils/agendaDates';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` }, timeout: 15000 });
export const NextActionPanel = ({ caseId }) => <NextAction key={caseId} caseId={caseId} />;
function NextAction({ caseId }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState(null);
    const version = useRef(0), lock = useRef(false);
    const load = useCallback(async () => {
        const current = ++version.current;
        setError('');
        try {
            const result = await axios.get(api.cases.nextAction(caseId), auth());
            if (!Array.isArray(result.data?.users) || !Object.hasOwn(result.data, 'nextAction')) throw new Error('Respuesta inválida');
            if (current === version.current) setData(result.data);
        } catch (err) { if (current === version.current) setError(err.response?.data?.message || 'No se pudo consultar la próxima acción.'); }
    }, [caseId]);
    useEffect(() => {
        const requests = version;
        load(); window.addEventListener('notifications-updated', load);
        return () => { ++requests.current; window.removeEventListener('notifications-updated', load); };
    }, [load]);
    const action = data?.nextAction;
    const completed = action?.status === 'COMPLETED';
    const start = () => {
        setForm({ title: completed ? '' : action?.title || '', date: !completed && action?.dueDate ? dayKey(action.dueDate) : dayKey(new Date()),
            assigneeId: !completed && action?.assigneeId || data.defaultAssigneeId || '',
            expectedTaskId: action?.id || null, expectedUpdatedAt: action?.updatedAt || null });
        setSaveError(''); setNotice(''); setEditing(true);
    };
    const save = async event => {
        event.preventDefault();
        if (lock.current) return;
        lock.current = true; setBusy(true); setSaveError('');
        try {
            await axios.put(api.cases.nextAction(caseId), { title: form.title, dueDate: form.date, assigneeId: form.assigneeId,
                expectedTaskId: form.expectedTaskId, expectedUpdatedAt: form.expectedUpdatedAt }, auth());
            setEditing(false); setNotice('Próxima acción guardada y vinculada al cronograma.'); notifyActivityChanged();
        } catch (err) { setSaveError(err.response?.data?.message || 'No se pudo confirmar el guardado. Los datos se conservan; actualizá antes de reintentar.'); }
        finally { lock.current = false; setBusy(false); }
    };
    const complete = async () => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setSaveError('');
        try {
            await axios.put(api.agenda.updateTask(action.id), { completed: true, updatedAt: action.updatedAt }, auth());
            setNotice('Acción cumplida. Ya podés definir el siguiente paso.'); notifyActivityChanged();
        } catch (err) { setSaveError(err.response?.data?.message || 'No se pudo confirmar el cumplimiento. Actualizá antes de reintentar.'); }
        finally { lock.current = false; setBusy(false); }
    };
    return <Card className="p-5 space-y-4 border-l-4 border-l-bronze" aria-label="Próxima acción del expediente">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg"><ArrowRight className="h-5 w-5 text-link" />Próxima acción</h3>
            <Button variant="ghost" size="sm" type="button" onClick={load} disabled={busy}>Actualizar acción</Button>
        </div>
        {error && <p role="alert" className="text-sm text-status-red">{error}</p>}
        {!data && !error && <p role="status" className="text-sm text-muted-foreground">Cargando próxima acción…</p>}
        {data && !error && <>
            {action ? <div className="space-y-2">
                <p className={`font-semibold ${completed ? 'text-muted-foreground line-through' : ''}`}>{action.title}</p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="h-4 w-4" />{action.assignee?.name || 'Sin responsable'}{action.assignee?.deletedAt ? ' (inactivo)' : ''}</span>
                    {action.dueDate && <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{fullDay(dayKey(action.dueDate))}</span>}
                    <span className={completed ? 'text-status-green' : action.dueDate && dayKey(action.dueDate) < dayKey(new Date()) ? 'text-status-red' : 'text-link'}>{completed ? 'Cumplida · definir siguiente paso' : action.dueDate && dayKey(action.dueDate) < dayKey(new Date()) ? 'Atrasada' : 'Pendiente'}</span>
                </div>
            </div> : <p className="text-sm text-muted-foreground">Este expediente todavía no tiene una próxima acción definida.</p>}
            {!editing && <div className="flex flex-wrap gap-2">
                {data.canEdit && <Button variant="outline" type="button" disabled={busy} onClick={start}>{!action || completed ? 'Definir próxima acción' : 'Editar próxima acción'}</Button>}
                {action && !completed && data.canComplete && <Button type="button" disabled={busy} onClick={complete}><CheckCircle2 />Marcar acción cumplida</Button>}
            </div>}
        </>}
        {notice && <p role="status" className="text-sm text-status-green">{notice}</p>}
        {editing && <form onSubmit={save} className="space-y-3 border-t border-border pt-4">
            <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Label className="sm:col-span-2">Qué hay que hacer<Input required maxLength={200} className="mt-1" placeholder="Ej.: solicitar documentación al cliente" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Label>
                <Label>Responsable<NativeSelect required className="w-full mt-1" value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value })}>
                    <option value="">Seleccioná responsable</option>{form.assigneeId && !data?.users.some(user => user.id === form.assigneeId) && <option value={form.assigneeId} disabled>Responsable no disponible</option>}
                    {data?.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
                </NativeSelect></Label>
                <Label>Fecha de la próxima acción<Input required type="date" className="mt-1" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Label>
            </fieldset>
            <p className="text-xs text-muted-foreground">Se guarda como tarea del expediente y aparece en el cronograma de su responsable.</p>
            <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar próxima acción'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(false)}>Cancelar</Button></div>
        </form>}
        {saveError && <p role="alert" className="text-sm text-status-red">{saveError}</p>}
    </Card>;
}
