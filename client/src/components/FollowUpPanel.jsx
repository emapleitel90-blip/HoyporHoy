import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isPrivateFile, downloadCaseFile, errorMessage } from '../utils/caseFiles';
import { followUpDateLabel as dateLabel, followUpDateInput as localInput, followUpDateISO } from '../utils/followUpTime';

const KINDS = { DOCUMENT: 'Documentación', COMMITMENT: 'Compromiso del cliente', BLOCKER: 'Motivo de bloqueo' };
const LABELS = { PENDING: 'Pendiente', RECEIVED: 'Recibido, falta verificar', REVISION_REQUESTED: 'Requiere corrección',
    VERIFIED: 'Verificado', COMPLETED: 'Cumplido / resuelto', CREATED: 'Creación', UPDATED: 'Actualización',
    RECEIVE: 'Recepción de archivo', VERIFY: 'Verificación', REQUEST_REVISION: 'Pedido de corrección', COMPLETE: 'Cumplimiento', REOPEN: 'Reapertura' };
const fresh = () => ({ kind: 'DOCUMENT', title: '', notes: '', dueDate: '', ownerId: '' });
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` } });

export const FollowUpPanel = ({ caseItem, inbox = false }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [items, setItems] = useState([]);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState(fresh);
    const [editing, setEditing] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [notes, setNotes] = useState({});
    const [selectedFiles, setSelectedFiles] = useState({});
    const [drafts, setDrafts] = useState({});
    const [error, setError] = useState(null);
    const [usersError, setUsersError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [filter, setFilter] = useState('mine');
    const version = useRef(0);
    const caseId = caseItem?.id;
    const studioId = caseItem?.studioId;
    const canReview = ['ADMIN', 'LAWYER', 'SUPER_ADMIN'].includes(user?.role);
    const load = useCallback(async () => {
        const requestId = ++version.current;
        setError(null);
        try {
            const { data } = await axios.get(inbox ? api.followUps[filter] : api.followUps.byCase(caseId), auth());
            if (requestId === version.current) setItems(data);
        } catch (err) {
            if (requestId === version.current) setError(err.response?.data?.message || 'No se pudo cargar el seguimiento.');
        } finally { if (requestId === version.current) setLoading(false); }
    }, [inbox, filter, caseId]);
    useEffect(() => {
        const currentVersion = version;
        setItems([]); setLoading(true); load();
        return () => { currentVersion.current++; };
    }, [load]);
    useEffect(() => {
        let cancelled = false;
        setUsers([]); setUsersError(null);
        if (inbox) return;
        if (!studioId) { if (caseItem?.createdBy) setUsers([caseItem.createdBy]); return; }
        axios.get(api.studios.users(studioId), auth())
            .then(({ data }) => { if (!cancelled) setUsers(data); })
            .catch(() => { if (!cancelled) setUsersError('No se pudieron cargar los responsables.'); });
        return () => { cancelled = true; };
    }, [inbox, studioId, caseItem?.createdBy]);
    const save = async event => {
        event.preventDefault(); setBusy(true); setError(null);
        try {
            const body = { ...form, dueDate: followUpDateISO(form.dueDate),
                ...(editing ? { version: editing.updatedAt } : {}) };
            if (editing) await axios.patch(api.followUps.update(editing.id), body, auth());
            else await axios.post(api.followUps.byCase(caseId), body, auth());
            setForm(fresh()); setEditing(null); setShowForm(false); await load();
        } catch (err) { setError(await errorMessage(err, 'No se pudo guardar el seguimiento.')); }
        finally { setBusy(false); }
    };
    const act = async (item, action) => {
        setBusy(true); setError(null);
        try {
            await axios.post(api.followUps.action(item.id), { action, version: item.updatedAt,
                notes: notes[item.id] || '', fileId: selectedFiles[item.id] || undefined }, auth());
            setNotes(current => ({ ...current, [item.id]: '' }));
            await load();
        } catch (err) { setError(await errorMessage(err, 'No se pudo actualizar el seguimiento.')); }
        finally { setBusy(false); }
    };
    const download = async file => {
        try { await downloadCaseFile(file); }
        catch (err) { setError(await errorMessage(err, 'No se pudo descargar el archivo.')); }
    };
    const prepare = item => {
        const message = `Hola. Te recordamos que está pendiente: ${item.title}.${item.dueDate ? ` Fecha acordada: ${dateLabel(item.dueDate)}.` : ''} ¿Podés confirmarnos cuándo podrás cumplirlo? Gracias.`;
        setDrafts(current => ({ ...current, [item.id]: message }));
    };
    const button = 'px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-50 text-indigo-700 disabled:opacity-40';
    const input = 'w-full rounded-lg border border-slate-200 bg-white p-2 text-sm';
    const files = (caseItem?.files || []).filter(isPrivateFile);
    return <section id={inbox?undefined:'case-follow-ups'} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">{inbox ? 'Seguimiento de clientes' : 'Documentación y compromisos del cliente'}</h2>
            <div className="flex gap-2">
                <button type="button" className={button} disabled={busy || loading} onClick={load}>Actualizar seguimiento</button>
                {!inbox && <button type="button" className={button} disabled={busy} onClick={() => { setForm(fresh()); setEditing(null); setShowForm(value => !value); }}>Nuevo seguimiento</button>}
            </div>
        </div>
        {inbox && <div className="flex gap-2">
            <button className={button} disabled={busy} aria-pressed={filter === 'mine'} onClick={() => setFilter('mine')}>A mi cargo</button>
            {canReview && <button className={button} disabled={busy} aria-pressed={filter === 'review'} onClick={() => setFilter('review')}>Documentos para verificar</button>}
        </div>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {usersError && <p role="alert" className="text-sm text-red-700">{usersError}</p>}
        {!inbox && showForm && <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
            <label className="text-sm">Tipo
                <select className={input} disabled={!!editing} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}>{Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
            </label>
            <label className="text-sm">Responsable del seguimiento
                <select className={input} required value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}>
                    <option value="">Seleccioná un integrante</option>
                    {users.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
            </label>
            <label className="text-sm sm:col-span-2">Qué falta / próximo paso
                <input className={input} required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="text-sm">Fecha acordada {form.kind === 'BLOCKER' && '(opcional)'}
                <input type="datetime-local" className={input} required={form.kind !== 'BLOCKER'} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </label>
            <label className="text-sm sm:col-span-2">Detalle
                <textarea className={input} maxLength={10000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </label>
            <div className="flex gap-2 sm:col-span-2"><button className={button} disabled={busy || !users.length}>{editing ? 'Guardar cambios' : 'Crear seguimiento'}</button>
                <button type="button" className={button} onClick={() => { setEditing(null); setShowForm(false); }} disabled={busy}>Cancelar</button></div>
        </form>}
        {loading ? <p role="status">Cargando seguimiento...</p> : !items.length && <p className="text-sm text-slate-500">No hay seguimientos en esta lista.</p>}
        {items.map(item => {
            const done = ['VERIFIED', 'COMPLETED'].includes(item.status);
            const canWork = item.ownerId === user?.id || canReview;
            const pendingDocument = item.kind === 'DOCUMENT' && ['PENDING', 'REVISION_REQUESTED'].includes(item.status);
            const review = canReview && item.kind === 'DOCUMENT' && item.status === 'RECEIVED';
            return <article key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-slate-900">{item.title}</h3><span className="text-xs rounded-full bg-slate-100 px-2 py-1">{LABELS[item.status]}</span></div>
                {inbox && <Link className="text-sm text-indigo-700 underline" to={`/cases/${item.caseId}`}>{item.case.caseNumber} · {item.case.title}</Link>}
                <p className="text-sm text-slate-600">{KINDS[item.kind]} · Responsable: {item.owner.name}</p>
                {item.dueDate && <p className={`text-sm ${!done && new Date(item.dueDate) < new Date() ? 'text-red-700 font-semibold' : 'text-slate-600'}`}>Fecha acordada: {dateLabel(item.dueDate)}{!done && new Date(item.dueDate) < new Date() ? ' · Atrasado' : ''}</p>}
                {item.kind === 'BLOCKER' && !done && <p className="text-sm text-amber-800">Este motivo de bloqueo sigue pendiente. Próximo paso: {item.notes || item.title}</p>}
                {item.notes && (item.kind !== 'BLOCKER' || done) && <p className="text-sm whitespace-pre-wrap">{item.notes}</p>}
                {item.file && <button className={button} onClick={() => download(item.file)}>Descargar {item.file.name}</button>}
                {canWork && <>
                    {!inbox && pendingDocument && <label className="block text-sm">Archivo recibido
                        <select className={input} value={selectedFiles[item.id] || ''} onChange={e => setSelectedFiles({ ...selectedFiles, [item.id]: e.target.value })}>
                            <option value="">Seleccioná un archivo cargado</option>{files.map(file => <option key={file.id} value={file.id}>{file.name}</option>)}
                        </select>
                        {!files.length && <a href="#case-files" className="text-indigo-700 underline text-xs">Cargá primero el documento en Archivos</a>}
                    </label>}
                    <label className="block text-sm">Observaciones del seguimiento
                        <textarea className={input} maxLength={10000} value={notes[item.id] || ''} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {!inbox && pendingDocument && <button className={button} disabled={busy || !selectedFiles[item.id]} onClick={() => act(item, 'RECEIVE')}>Marcar recibido</button>}
                        {review && <><button className={button} disabled={busy} onClick={() => act(item, 'VERIFY')}>Verificar documento</button><button className={button} disabled={busy || !notes[item.id]?.trim()} onClick={() => act(item, 'REQUEST_REVISION')}>Pedir corrección</button></>}
                        {item.kind !== 'DOCUMENT' && !done && <button className={button} disabled={busy || !notes[item.id]?.trim()} onClick={() => act(item, 'COMPLETE')}>Marcar cumplido / resuelto</button>}
                        {item.status !== 'PENDING' && (item.status !== 'VERIFIED' || canReview) && <button className={button} disabled={busy || !notes[item.id]?.trim()} onClick={() => act(item, 'REOPEN')}>Reabrir seguimiento</button>}
                        {!inbox && !done && <button className={button} disabled={busy} onClick={() => { setForm({ kind: item.kind, title: item.title, notes: item.notes || '', ownerId: item.ownerId, dueDate: localInput(item.dueDate) }); setEditing(item); setShowForm(true); }}>Editar seguimiento</button>}
                    </div>
                </>}
                {(pendingDocument || (item.kind === 'COMMITMENT' && !done)) && <button className={button} onClick={() => prepare(item)}>Preparar recordatorio</button>}
                {drafts[item.id] !== undefined && <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                    <label className="block text-sm">Borrador para WhatsApp
                        <textarea className={input} value={drafts[item.id]} onChange={e => setDrafts({ ...drafts, [item.id]: e.target.value })} />
                    </label>
                    <p className="text-xs text-slate-500">Revisá el contenido antes de enviarlo.</p>
                    <button className={button} onClick={async () => { try { await navigator.clipboard.writeText(drafts[item.id]); showToast('Borrador copiado', 'success'); } catch { showToast('Podés seleccionar y copiar el texto del borrador', 'info'); } }}>Copiar borrador</button>
                </div>}
                <details className="text-sm"><summary className="cursor-pointer text-slate-600">Historial de seguimiento ({item.events.length})</summary><ol className="mt-2 space-y-2">{item.events.map(event => <li key={event.id} className="border-l-2 border-indigo-100 pl-3"><p className="text-xs text-slate-500">{dateLabel(event.createdAt)} · {event.user.name} · {LABELS[event.action] || event.action}</p>{event.notes && <p className="whitespace-pre-wrap">{event.notes}</p>}</li>)}</ol></details>
            </article>;
        })}
    </section>;
};
