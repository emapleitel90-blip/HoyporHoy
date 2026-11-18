import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, FileText, Gavel, Check, Pencil, ExternalLink, RefreshCw } from 'lucide-react';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { dayKey, shiftDay, fullDay, clockTime, activityDate } from '../utils/agendaDates';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';
import { AgendaDialog } from './AgendaDialog';
import { DeadlinePanel } from './DeadlinePanel';

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` }, timeout: 15000 });
const PRIORITY = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' };
const STATUS = { PENDING: 'Pendiente', IN_PROGRESS: 'En curso', SUBMITTED: 'En revisión', REVISION_REQUESTED: 'Correcciones', APPROVED: 'Aprobada', COMPLETED: 'Cumplida', SCHEDULED: 'Programada' };
const WEIGHT = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
const COLORS = { LOW: 'bg-muted-foreground/50', MEDIUM: 'bg-link/60', HIGH: 'bg-status-amber', URGENT: 'bg-status-red' };
const countLabel = count => String(count) + (count === 1 ? ' actividad' : ' actividades');
const emptyForm = day => ({ title: '', instructions: '', date: day, time: '', priority: 'MEDIUM', caseId: '', assigneeId: '' });

export function LegalTimeline({ onChanged, refreshVersion = 0 }) {
    const today = dayKey(new Date());
    const [selected, setSelected] = useState(today);
    const [start, setStart] = useState(() => shiftDay(today, -3));
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [completionConflict, setCompletionConflict] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [options, setOptions] = useState({ cases: [], users: [], canAssign: false });
    const [optionsReady, setOptionsReady] = useState(false);
    const [optionsError, setOptionsError] = useState('');
    const [form, setForm] = useState(() => emptyForm(today));
    const [saveError, setSaveError] = useState('');
    const [deadlineConflict, setDeadlineConflict] = useState(false);
    const [busy, setBusy] = useState(false);
    const [deadlineCaseId, setDeadlineCaseId] = useState('');
    const scrollRef = useRef(null);
    const selectionRef = useRef(null);
    const requestVersion = useRef(0);
    const mutationLock = useRef(false);
    const end = shiftDay(start, 21);
    const days = useMemo(() => Array.from({ length: 21 }, (_, index) => shiftDay(start, index)), [start]);

    const load = useCallback(async () => {
        const version = ++requestVersion.current;
        setLoading(true); setError('');
        try {
            const { data } = await axios.get(api.agenda.list, { ...auth(), params: { start, end } });
            if (!Array.isArray(data?.activities)) throw new Error('Respuesta inválida');
            if (version === requestVersion.current) setActivities(data.activities);
        } catch (err) {
            if (version === requestVersion.current) setError(err.response?.data?.message || 'No se pudo cargar el cronograma. Reintentá para ver las actividades actualizadas.');
        } finally { if (version === requestVersion.current) setLoading(false); }
    }, [start, end]);
    useEffect(() => {
        const versions = requestVersion;
        load();
        const refresh = () => load();
        window.addEventListener('notifications-updated', refresh);
        window.addEventListener('focus', refresh);
        return () => { ++versions.current; window.removeEventListener('notifications-updated', refresh); window.removeEventListener('focus', refresh); };
    }, [load, refreshVersion]);
    useEffect(() => {
        const strip = scrollRef.current, item = selectionRef.current;
        const center = () => {
            if (!strip || !item) return;
            const left = strip.scrollLeft + item.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - item.clientWidth) / 2;
            strip.scrollTo?.({ left, behavior: 'smooth' });
        };
        center();
        if (!strip || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(center);
        observer.observe(strip);
        return () => observer.disconnect();
    }, [selected, start]);
    useEffect(() => {
        const strip = scrollRef.current;
        const wheel = event => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && strip.scrollWidth > strip.clientWidth) {
                const next = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, strip.scrollLeft + event.deltaY));
                if (next !== strip.scrollLeft) { event.preventDefault(); strip.scrollLeft = next; }
            }
        };
        strip?.addEventListener('wheel', wheel, { passive: false });
        return () => strip?.removeEventListener('wheel', wheel);
    }, []);
    const optionsVersion = useRef(0);
    const loadOptions = useCallback(async (caseId = '') => {
        const version = ++optionsVersion.current;
        setOptionsReady(false); setOptionsError('');
        try {
            const { data } = await axios.get(api.agenda.options, { ...auth(), params: { caseId: caseId || undefined } });
            if (!Array.isArray(data.cases) || !Array.isArray(data.users)) throw new Error('Respuesta inválida');
            if (version !== optionsVersion.current) return;
            setOptions(data); setOptionsReady(true);
        } catch (err) { if (version === optionsVersion.current) setOptionsError(err.response?.data?.message || 'No se pudieron cargar los expedientes y responsables.'); }
    }, []);
    const chooseDay = day => {
        if (!day) return;
        setSelected(day);
        if (day < start || day >= end) setStart(shiftDay(day, -3));
    };
    const openTask = activity => {
        setSaveError(''); setNotice(''); setDeadlineConflict(false); setCompletionConflict(false);
        const date = activity ? dayKey(activity.date) : selected;
        const time = activity && clockTime(activity.date) !== '00:00' ? clockTime(activity.date) : '';
        setForm(activity ? { title: activity.title, instructions: activity.description || '', date, time, priority: activity.priority || 'MEDIUM', caseId: activity.case?.id || '', assigneeId: activity.assignee?.id || '' } : emptyForm(selected));
        setDialog(activity ? { type: activity.source === 'DEADLINE' ? 'editDeadline' : 'editTask', activity } : { type: 'task' });
        if (!activity) loadOptions();
    };
    const confirmMutation = () => {
        notifyActivityChanged();
        onChanged?.();
    };
    const save = async event => {
        event.preventDefault();
        if (mutationLock.current || deadlineConflict) return;
        mutationLock.current = true; setBusy(true); setSaveError('');
        try {
            const dueDate = activityDate(form.date, form.time);
            const activity = dialog.activity;
            if (dialog.type === 'editDeadline') {
                await axios.put(api.deadlines.update(activity.sourceId), { title: form.title, notes: form.instructions, dueDate, version: activity.editVersion }, auth());
            } else {
                const body = { title: form.title, instructions: form.instructions, dueDate, priority: form.priority,
                    ...(activity ? { updatedAt: activity.updatedAt } : { caseId: form.caseId || null, assigneeId: form.assigneeId || options.defaultAssigneeId || undefined }) };
                if (activity) await axios.put(api.agenda.updateTask(activity.sourceId), body, auth());
                else await axios.post(api.agenda.createTask, body, auth());
            }
            chooseDay(form.date); setDialog(null); setNotice('Actividad guardada.'); confirmMutation();
        } catch (err) {
            setSaveError(err.response?.data?.message || 'No se pudo confirmar el guardado. Los datos se conservan. Actualizá el cronograma antes de reintentar para comprobar si se guardó.');
            if (dialog.type === 'editDeadline' && [404, 409].includes(err.response?.status)) setDeadlineConflict(true);
        }
        finally { mutationLock.current = false; setBusy(false); }
    };
    const complete = async activity => {
        if (mutationLock.current) return;
        mutationLock.current = true; setBusy(true); setError(''); setNotice(''); setCompletionConflict(false);
        try {
            if (activity.source === 'DEADLINE') await axios.put(api.deadlines.update(activity.sourceId), { isCompleted: !activity.completed, version: activity.editVersion }, auth());
            else await axios.put(api.agenda.updateTask(activity.sourceId), { completed: !activity.completed, updatedAt: activity.updatedAt }, auth());
            setNotice(activity.completed ? 'Actividad reabierta.' : 'Actividad cumplida.'); confirmMutation();
        } catch (err) {
            if (activity.source === 'DEADLINE' && [404, 409].includes(err.response?.status)) {
                await load();
                setCompletionConflict(true);
            } else {
                setError(err.response?.data?.message || 'No se pudo confirmar el cambio. Actualizá antes de reintentar.');
            }
        }
        finally { mutationLock.current = false; setBusy(false); }
    };
    const grouped = useMemo(() => {
        const map = new Map();
        for (const activity of activities) {
            const key = dayKey(activity.date);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(activity);
        }
        return map;
    }, [activities]);
    const maxCount = Math.max(1, ...[...grouped.values()].map(items => items.length));
    const selectedItems = grouped.get(selected) || [];
    const field = (name, value) => setForm(current => ({ ...current, [name]: value }));
    const selectCase = value => {
        setForm(current => ({ ...current, caseId: value, assigneeId: '' }));
        loadOptions(value);
    };

    return <Card className="min-w-0 overflow-hidden border-border bg-card p-4 sm:p-6 space-y-5 mb-8" aria-label="Cronograma jurídico">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <span className="rounded-lg bg-accent p-3 text-link"><CalendarDays className="h-6 w-6" /></span>
                <div><h2 className="text-2xl text-foreground">Cronograma</h2><p className="text-sm text-muted-foreground">Organizá plazos, tareas y audiencias por día.</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" type="button" onClick={() => { setDeadlineCaseId(''); setDialog({ type: 'deadline' }); loadOptions(); }}><CalendarDays />Nuevo plazo</Button>
                <Button type="button" onClick={() => openTask()}><Plus />Agregar tarea</Button>
            </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold first-letter:uppercase">{new Date(`${selected}T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
            <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="agenda-date" className="sr-only">Ir a una fecha</Label><Input id="agenda-date" type="date" className="w-auto max-w-full" value={selected} onChange={e => chooseDay(e.target.value)} />
                <Button variant="outline" onClick={() => chooseDay(dayKey(new Date()))}>Hoy</Button>
                <Button variant="ghost" size="icon" aria-label="Actualizar cronograma" disabled={loading || busy} onClick={load}><RefreshCw className={loading ? 'animate-spin' : ''} /></Button>
            </div>
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-status-red">{error} <Button variant="link" disabled={loading || busy} onClick={load}>Reintentar</Button></div>}
        {notice && <p role="status" className="text-sm text-status-green">{notice}</p>}
        {completionConflict && <p role="alert" className="text-sm text-status-red">El vencimiento cambió. Revisá el cronograma antes de volver a modificarlo.</p>}
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
            <Button variant="outline" size="icon" className="shrink-0" aria-label="Fechas anteriores" onClick={() => { setStart(shiftDay(start, -7)); setSelected(shiftDay(selected, -7)); }}><ChevronLeft /></Button>
            <div ref={scrollRef} className="legal-timeline-strip flex-1 min-w-0 overflow-x-auto overscroll-x-contain snap-x snap-proximity pb-2" aria-label="Fechas del cronograma" aria-busy={loading}>
                <div className="flex min-w-max">
                    {days.map(day => {
                        const items = grouped.get(day) || [];
                        const highest = items.filter(item => !item.completed).reduce((priority, item) => WEIGHT[item.priority] > WEIGHT[priority] ? item.priority : priority, 'LOW');
                        const active = day === selected;
                        return <button key={day} ref={active ? selectionRef : null} type="button" aria-pressed={active}
                            aria-label={`${fullDay(day)}: ${countLabel(items.length)}${day === today ? ', hoy' : ''}`}
                            onClick={() => chooseDay(day)} className={`snap-center shrink-0 w-[76px] sm:w-[96px] group focus-visible:ring-2 focus-visible:ring-ring rounded-md ${active ? 'bg-accent/60' : 'hover:bg-muted/50'}`}>
                            <div className="h-[112px] flex items-end justify-center border-b border-link/60 relative">
                                {items.length > 0 && !error && <span className={`w-3.5 rounded-t-md transition-[height] duration-300 ${COLORS[highest]}`} style={{ height: `${Math.max(10, items.length / maxCount * 92)}px` }} />}
                                <span className={`absolute -bottom-1 w-2 h-2 rounded-full ring-2 ring-card ${day === today ? 'bg-bronze' : active ? 'bg-link' : 'bg-muted-foreground'}`} />
                            </div>
                            <div className={`mt-2 mx-2 py-2 rounded-md border ${active ? 'border-ring bg-accent' : 'border-transparent'}`}>
                                <span className="block text-lg leading-5 font-semibold">{Number(day.slice(-2))}</span>
                                <span className="block text-xs capitalize text-muted-foreground">{new Date(`${day}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                                <span className="block text-[10px] h-4 text-muted-foreground">{!error && items.length ? `${items.length} act.` : '\u00a0'}</span>
                            </div>
                        </button>;
                    })}
                </div>
            </div>
            <Button variant="outline" size="icon" className="shrink-0" aria-label="Fechas siguientes" onClick={() => { setStart(shiftDay(start, 7)); setSelected(shiftDay(selected, 7)); }}><ChevronRight /></Button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Altura: cantidad de actividades.</span><span>Color: mayor prioridad pendiente.</span>
            {Object.entries(PRIORITY).map(([key, label]) => <span key={key} className="inline-flex items-center gap-1"><i className={`w-2 h-2 rounded-full ${COLORS[key]}`} />{label}</span>)}
        </div>
        <div className="rounded-lg border border-border bg-background/40 p-4 grid grid-cols-1 lg:grid-cols-[235px_minmax(0,1fr)] gap-5">
            <div className="lg:border-r border-border lg:pr-5">
                <h3 className="text-base first-letter:uppercase leading-relaxed">{selected === today ? 'Hoy, ' : ''}{fullDay(selected)}</h3>
                <p className="inline-block mt-3 px-3 py-1 rounded-full bg-secondary text-sm" aria-live="polite">{loading ? 'Cargando…' : error ? 'Sin confirmar' : countLabel(selectedItems.length)}</p>
            </div>
            <div className="min-w-0 space-y-2">
                {loading ? <p role="status" className="text-sm text-muted-foreground py-4">Actualizando actividades…</p> : error ? <p className="text-sm text-muted-foreground py-4">Actualizá el cronograma para consultar esta fecha.</p> : selectedItems.length === 0 ? <p className="text-sm text-muted-foreground py-4">No hay actividades registradas para este día.</p> : selectedItems.map(activity => {
                    const Icon = activity.kind === 'HEARING' ? Gavel : activity.kind === 'DEADLINE' ? CalendarDays : FileText;
                    return <article key={activity.id} className="rounded-lg border border-border bg-card p-3 flex items-start gap-3">
                        {activity.canComplete ? <Button type="button" size="icon" variant="ghost" className="shrink-0 h-9 w-9" disabled={busy} aria-label={`${activity.completed ? 'Reabrir' : 'Completar'}: ${activity.title}`} onClick={() => complete(activity)}>{activity.completed ? <Check className="text-status-green" /> : <span className="block h-4 w-4 border border-muted-foreground rounded-sm" />}</Button> : <Icon className="h-5 w-5 shrink-0 mt-2 text-link" />}
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h4 className={`text-sm font-semibold break-words ${activity.completed ? 'line-through text-muted-foreground' : ''}`}>{activity.title}</h4><span className="text-xs rounded-full px-2 py-0.5 bg-muted">{STATUS[activity.status] || activity.status}</span><span className={`text-xs ${activity.priority === 'URGENT' ? 'text-status-red' : activity.priority === 'HIGH' ? 'text-status-amber' : 'text-muted-foreground'}`}>{PRIORITY[activity.priority] || 'Media'}</span></div>
                            <p className="text-xs text-muted-foreground">{activity.kind === 'HEARING' ? 'Audiencia' : activity.kind === 'DEADLINE' ? 'Plazo' : 'Tarea'}{clockTime(activity.date) !== '00:00' ? ` · ${clockTime(activity.date)}` : ''}{activity.assignee ? ` · ${activity.assignee.name}` : ''}</p>
                            {activity.case && <Link className="inline-flex items-center gap-1 text-xs text-link underline break-words" to={`/cases/${activity.case.id}`}><ExternalLink className="h-3 w-3 shrink-0" />{activity.case.caseNumber} · {activity.case.title}</Link>}
                            {activity.description && <p className="text-xs text-secondary-foreground whitespace-pre-wrap break-words">{activity.description}</p>}
                            {activity.reviewRequired && <p className="text-xs text-muted-foreground">Avance y revisión desde las tareas del expediente.</p>}
                            {activity.source === 'CASE' && <Link className="inline-block text-xs text-link underline" to={`/cases/${activity.case.id}/edit`}>Editar audiencia en el expediente</Link>}
                        </div>
                        {activity.canEdit && <Button variant="ghost" size="icon" className="shrink-0" disabled={busy} aria-label={`Editar o reprogramar: ${activity.title}`} onClick={() => openTask(activity)}><Pencil /></Button>}
                    </article>;
                })}
                <Button variant="outline" className="w-full justify-start text-muted-foreground h-auto py-3" onClick={() => openTask()}><Plus />Agregar tarea para este día…</Button>
            </div>
        </div>
        {dialog && <AgendaDialog title={dialog.type === 'deadline' ? 'Nuevo plazo del expediente' : dialog.type === 'task' ? 'Agregar tarea' : 'Editar y reprogramar actividad'} busy={busy} onClose={() => setDialog(null)}>
            {dialog.type === 'deadline' ? <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Usá la agenda de vencimientos del expediente. La fecha seleccionada es {fullDay(selected)}.</p>
                {optionsError && <p role="alert" className="text-sm text-status-red">{optionsError} <Button variant="link" onClick={() => loadOptions()}>Reintentar</Button></p>}
                <Label className="block">Expediente<NativeSelect className="mt-2 w-full" value={deadlineCaseId} disabled={!optionsReady} onChange={e => setDeadlineCaseId(e.target.value)}><option value="">Seleccioná un expediente</option>{options.cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber} · {item.title}</option>)}</NativeSelect></Label>
                {optionsReady && options.cases.length === 0 && <p className="text-sm text-muted-foreground">Primero registrá un expediente para vincular el plazo.</p>}
                {deadlineCaseId && <DeadlinePanel caseId={deadlineCaseId} initialDate={selected} onChanged={() => { onChanged?.(); }} />}
            </div> : <form onSubmit={save} className="space-y-4">
                <fieldset disabled={busy} className="space-y-4">
                    <Label className="block">Título<Input required maxLength={200} className="mt-1" value={form.title} onChange={e => field('title', e.target.value)} /></Label>
                    <Label className="block">Descripción opcional<Textarea maxLength={10000} rows={3} className="mt-1" value={form.instructions} onChange={e => field('instructions', e.target.value)} /></Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Label className="block">Fecha<Input required type="date" className="mt-1 w-full" value={form.date} onChange={e => field('date', e.target.value)} /></Label>
                        <Label className="block">Hora (Argentina, opcional)<Input type="time" className="mt-1 w-full" value={form.time} onChange={e => field('time', e.target.value)} /></Label>
                    </div>
                    {dialog.type !== 'editDeadline' && <Label className="block">Prioridad<NativeSelect className="mt-1 w-full" value={form.priority} onChange={e => field('priority', e.target.value)}>{Object.entries(PRIORITY).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Label>}
                    {dialog.type === 'task' && <>
                        {optionsError && <p role="alert" className="text-sm text-status-red">{optionsError} <Button type="button" variant="link" onClick={() => loadOptions(form.caseId)}>Reintentar</Button></p>}
                        <Label className="block">Expediente (opcional)<NativeSelect className="mt-1 w-full" disabled={!optionsReady} value={form.caseId} onChange={e => selectCase(e.target.value)}><option value="">Sin expediente · tarea personal</option>{options.cases.map(item => <option key={item.id} value={item.id}>{item.caseNumber} · {item.title}</option>)}</NativeSelect></Label>
                        {options.canAssign && <Label className="block">Responsable<NativeSelect className="mt-1 w-full" required={!options.defaultAssigneeId} disabled={!optionsReady} value={form.assigneeId} onChange={e => field('assigneeId', e.target.value)}><option value="">{options.defaultAssigneeId ? 'Yo' : 'Seleccioná responsable'}</option>{options.users.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></Label>}
                        <p className="text-xs text-muted-foreground">Estado inicial: pendiente. Las entregas con revisor se crean desde las tareas del expediente.</p>
                    </>}
                </fieldset>
                {saveError && <p role="alert" className="text-sm text-status-red">{saveError}</p>}
                {deadlineConflict && <div className="space-y-2 text-sm">
                    <p>Tu borrador sigue en este formulario. Podés abrir la ficha en otra pestaña para comparar.</p>
                    {dialog.activity.case && <Link className="text-link underline" to={`/cases/${dialog.activity.case.id}#agenda-vencimientos`} target="_blank" rel="noopener noreferrer">Ver vencimientos guardados</Link>}
                </div>}
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" type="button" disabled={busy} onClick={() => { setDialog(null); if (deadlineConflict) load(); }}>
                        {deadlineConflict ? 'Descartar borrador y actualizar cronograma' : 'Cancelar'}
                    </Button>
                    <Button type="submit" disabled={busy || deadlineConflict || (dialog.type === 'task' && !optionsReady)}>{busy ? 'Guardando…' : 'Guardar actividad'}</Button>
                </div>
            </form>}
        </AgendaDialog>}
    </Card>;
}
