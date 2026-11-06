import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { NativeSelect } from './ui/native-select';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { useAuth } from '../context/AuthContext';
import { TaskWritingVersion } from './TaskWritingVersion';

const LABELS = {
    PENDING: 'Pendiente', IN_PROGRESS: 'En curso', SUBMITTED: 'En revisión',
    REVISION_REQUESTED: 'Correcciones solicitadas', APPROVED: 'Aprobada',
    CREATED: 'Creación', STARTED: 'Inicio', PROGRESS_RECORDED: 'Avance registrado',
};
const blankForm = { title: '', instructions: '', assigneeId: '', reviewerId: '', dueDate: '' };
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('lyp_token')}` });

export const TaskPanel = ({ caseItem, inbox = false }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState(blankForm);
    const [notes, setNotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [usersError, setUsersError] = useState(null);
    const [busy, setBusy] = useState(null);
    const [filter, setFilter] = useState('mine');
    const [selectedVersions, setSelectedVersions] = useState({});
    const [reviewReady, setReviewReady] = useState({});
    const requests = useRef({});
    const loadVersion = useRef(0);
    const caseId = caseItem?.id;
    const studioId = caseItem?.studioId;

    const load = useCallback(async () => {
        const version = ++loadVersion.current;
        setError(null);
        try {
            const url = inbox ? (filter === 'mine' ? api.tasks.myTasks : api.tasks.reviewTasks) : api.tasks.byCase(caseId);
            const { data } = await axios.get(url, { headers: headers() });
            if (version === loadVersion.current) setTasks(data);
        } catch (err) {
            if (version === loadVersion.current) setError(err.response?.data?.message || 'No se pudieron cargar las tareas.');
        } finally {
            if (version === loadVersion.current) setLoading(false);
        }
    }, [caseId, inbox, filter]);

    useEffect(() => {
        const currentVersion = loadVersion;
        setTasks([]); setLoading(true); load();
        return () => { currentVersion.current++; };
    }, [load]);
    useEffect(() => {
        let cancelled = false;
        setUsers([]);
        setUsersError(null);
        if (inbox) return;
        if (!studioId) {
            if (user?.id === caseItem?.createdById) setUsers([user]);
            return;
        }
        axios.get(api.studios.users(studioId), { headers: headers() })
            .then(({ data }) => { if (!cancelled) setUsers(data); })
            .catch(() => { if (!cancelled) setUsersError('No se pudieron cargar los integrantes del estudio.'); });
        return () => { cancelled = true; };
    }, [studioId, inbox, user, caseItem?.createdById]);

    const create = async (event) => {
        event.preventDefault();
        setBusy('create');
        setError(null);
        try {
            await axios.post(api.tasks.create(caseId), {
                ...form, dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
            }, { headers: headers() });
            notifyActivityChanged();
            setForm(blankForm);
            await load();
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo crear la tarea.');
        } finally { setBusy(null); }
    };
    const act = async (task, operation, decision) => {
        setBusy(task.id);
        setError(null);
        try {
            const submission = task.events.filter(event => event.action === 'SUBMITTED').at(-1);
            const linked = operation === 'submit' ? task.requiresWriting || selectedVersions[task.id] : operation === 'review' && submission?.writingVersionId;
            const payload = {
                notes: notes[task.id] || '', ...(decision ? { decision } : {}),
                ...(linked && operation === 'submit' ? { writingVersionId: selectedVersions[task.id] } : {}),
                ...(linked && operation === 'review' ? { submissionId: submission.id } : {}),
            };
            if (linked) {
                const key = JSON.stringify([operation, payload]);
                if (requests.current[task.id]?.key !== key) requests.current[task.id] = { key, id: crypto.randomUUID() };
                payload.requestId = requests.current[task.id].id;
            }
            ++loadVersion.current;
            const { data } = await axios.put(api.tasks[operation](task.id), payload, { headers: headers() });
            if (linked && !data.events?.some(event => event.requestId === payload.requestId)) throw new Error('Respuesta inválida');
            notifyActivityChanged();
            setTasks(current => current.map(item => item.id === task.id ? data : item)
                .filter(item => !inbox || (filter === 'mine' ? item.status !== 'APPROVED' : item.status === 'SUBMITTED')));
            setNotes(current => ({ ...current, [task.id]: '' }));
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo actualizar la tarea.');
        } finally { setBusy(null); }
    };
    const field = 'w-full border border-border rounded-lg p-2 text-sm bg-card';
    const button = 'px-3 py-2 text-sm font-semibold bg-indigo-50 text-link rounded-lg disabled:opacity-40';
    const reviewers = users.filter(member => ['LAWYER', 'ADMIN', 'SUPER_ADMIN'].includes(member.role));

    return (
        <section className="bg-card border border-border rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground">{inbox ? 'Mis tareas y revisiones' : 'Tareas del expediente'}</h2>
                <Button variant="legacy" size="legacy" type="button" className={button} onClick={load} disabled={!!busy || loading}>Actualizar tareas</Button>
            </div>
            {inbox && <div className="flex gap-2">
                <Button variant="legacy" size="legacy" className={button} disabled={!!busy} aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>Mis tareas</Button>
                <Button variant="legacy" size="legacy" className={button} disabled={!!busy} aria-pressed={filter === 'review'} onClick={() => setFilter('review')}>Para revisar</Button>
            </div>}
            {error && <p role="alert" className="text-sm text-status-red">{error}</p>}
            {usersError && <p role="alert" className="text-sm text-status-red">{usersError}</p>}
            {!inbox && <form onSubmit={create} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-background rounded-xl p-4">
                <Label className="text-sm sm:col-span-2">Título
                    <Input className={field} required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </Label>
                <Label className="text-sm sm:col-span-2">Instrucciones
                    <Textarea className={field} maxLength={10000} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
                </Label>
                <Label className="text-sm"><input type="checkbox" checked={!!form.requiresWriting} onChange={e => setForm({ ...form, requiresWriting: e.target.checked })} /> La entrega requiere un escrito</Label>
                <Label className="text-sm">Responsable
                    <NativeSelect className={field} required value={form.assigneeId} onChange={e => setForm({ ...form, assigneeId: e.target.value, reviewerId: studioId && e.target.value === form.reviewerId ? '' : form.reviewerId })}>
                        <option value="">Seleccioná un integrante</option>
                        {users.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </NativeSelect>
                </Label>
                <Label className="text-sm">Revisor
                    <NativeSelect className={field} required value={form.reviewerId} onChange={e => setForm({ ...form, reviewerId: e.target.value })}>
                        <option value="">Seleccioná un revisor</option>
                        {reviewers.filter(member => !studioId || member.id !== form.assigneeId).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </NativeSelect>
                </Label>
                <Label className="text-sm">Vencimiento (opcional)
                    <Input type="datetime-local" className={field} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </Label>
                <div className="flex items-end"><Button variant="legacy" size="legacy" className={button} disabled={!!busy || !users.length}>Crear tarea</Button></div>
                {!studioId && <p className="text-xs text-muted-foreground sm:col-span-2">En expedientes independientes, el titular realiza y revisa sus propias tareas.</p>}
            </form>}
            {loading ? <p role="status">Cargando tareas...</p> : !tasks.length && <p className="text-sm text-muted-foreground">No hay tareas en esta lista.</p>}
            {tasks.map(task => {
                const canWork = task.assigneeId === user?.id;
                const canReview = task.reviewerId === user?.id && ['LAWYER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role) && task.status === 'SUBMITTED';
                const canAdvance = canWork && task.status === 'IN_PROGRESS';
                const submission = task.events.filter(event => event.action === 'SUBMITTED').at(-1);
                return <article key={task.id} className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap justify-between gap-2">
                        <h3 className="font-bold text-foreground">{task.title}</h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-full">{LABELS[task.status]}</span>
                    </div>
                    {inbox && <Link className="text-sm text-link underline" to={`/cases/${task.caseId}`}>{task.case.caseNumber} · {task.case.title}</Link>}
                    <p className="text-sm text-secondary-foreground">Responsable: {task.assignee.name} · Revisor: {task.reviewer.name}</p>
                    {task.dueDate && <p className="text-sm text-secondary-foreground">Vence: {new Date(task.dueDate).toLocaleString('es-AR')}</p>}
                    {task.instructions && <p className="text-sm whitespace-pre-wrap">{task.instructions}</p>}
                    {canAdvance && <TaskWritingVersion key={task.id} caseId={task.caseId} selected={selectedVersions[task.id]} onSelect={id => setSelectedVersions(current => ({ ...current, [task.id]: id }))} />}
                    {submission?.writingVersion && <><p>Última entrega: {submission.writingVersion.title} · versión {submission.writingVersion.number}. La revisión se refiere a esta versión.</p>
                        <TaskWritingVersion caseId={task.caseId} fixed={submission.writingVersion} onReady={ready => setReviewReady(current => ({ ...current, [task.id]: ready ? submission.id : null }))} /></>}
                    {(canAdvance || canReview) && <Label className="block text-sm">Observaciones / resultado
                        <Textarea className={field} maxLength={10000} value={notes[task.id] || ''} onChange={e => setNotes({ ...notes, [task.id]: e.target.value })} />
                    </Label>}
                    <div className="flex flex-wrap gap-2">
                        {canWork && ['PENDING', 'REVISION_REQUESTED'].includes(task.status) && <Button variant="legacy" size="legacy" className={button} disabled={!!busy} onClick={() => act(task, 'start')}>{task.status === 'PENDING' ? 'Iniciar' : 'Retomar'}</Button>}
                        {canAdvance && <>
                            <Button variant="legacy" size="legacy" className={button} disabled={!!busy || !notes[task.id]?.trim()} onClick={() => act(task, 'progress')}>Registrar avance</Button>
                            <Button variant="legacy" size="legacy" className={button} disabled={!!busy || !notes[task.id]?.trim() || (task.requiresWriting && !selectedVersions[task.id])} onClick={() => act(task, 'submit')}>Enviar a revisión</Button>
                        </>}
                        {canReview && <>
                            <Button variant="legacy" size="legacy" className={button} disabled={!!busy || (submission?.writingVersion && reviewReady[task.id] !== submission.id)} onClick={() => act(task, 'review', 'APPROVED')}>Aprobar</Button>
                            <Button variant="legacy" size="legacy" className={button} disabled={!!busy || !notes[task.id]?.trim() || (submission?.writingVersion && reviewReady[task.id] !== submission.id)} onClick={() => act(task, 'review', 'REVISION_REQUESTED')}>Solicitar correcciones</Button>
                        </>}
                    </div>
                    <details className="text-sm"><summary className="cursor-pointer text-secondary-foreground">Historial ({task.events.length})</summary>
                        <ol className="mt-2 space-y-2">{task.events.map(event => <li key={event.id} className="border-l-2 border-ring pl-3">
                            <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString('es-AR')} · {event.user.name} · {LABELS[event.action] || event.action}</p>
                            {event.notes && <p className="whitespace-pre-wrap">{event.notes}</p>}
                            {event.writingVersion && <p>{event.writingVersion.title} · versión {event.writingVersion.number}{event.action === 'APPROVED' ? ' · Aprobada en esta entrega' : ''}</p>}
                        </li>)}</ol>
                    </details>
                </article>;
            })}
        </section>
    );
};
