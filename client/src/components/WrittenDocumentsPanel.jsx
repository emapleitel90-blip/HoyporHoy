import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/caseFiles';
import { WritingTemplateLibrary } from './WritingTemplateLibrary';

const auth = () => ({ headers: { Authorization: 'Bearer ' + localStorage.getItem('lyp_token') } });
const time = value => new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
const WORD_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const validMetadata = value => value && typeof value.id === 'string' && typeof value.writingId === 'string' &&
    Number.isSafeInteger(value.number) && value.number > 0 && typeof value.title === 'string';
const validDetail = (data, caseId, writingId, number) => data?.caseId === caseId && (!writingId || data.id === writingId) &&
    Number.isSafeInteger(data.currentVersion) && data.currentVersion > 0 && Array.isArray(data.versions) &&
    validMetadata(data.selectedVersion) && data.selectedVersion.writingId === data.id && data.selectedVersion.number <= data.currentVersion &&
    (!number || data.selectedVersion.number === number) && typeof data.selectedVersion.content === 'string' &&
    data.versions.every(item => validMetadata(item) && item.writingId === data.id && item.number <= data.currentVersion) &&
    data.versions.some(item => item.number === data.currentVersion) &&
    data.versions.some(item => item.id === data.selectedVersion.id && item.number === data.selectedVersion.number && item.title === data.selectedVersion.title);

function WritingEditor({ caseId, writing, seed, canWrite, busy, onBusyChange, onSaved, onClose, onDiscardAndReload }) {
    const initial = useRef(writing?.selectedVersion || seed || null);
    const [draft, setDraft] = useState(() => ({ title: initial.current?.title || '', content: initial.current?.content || '', notes: '' }));
    const expectedVersion = useRef(writing?.currentVersion);
    const requestId = useRef(null);
    const submitting = useRef(false);
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const change = (field, value) => { requestId.current = null; setDraft(current => ({ ...current, [field]: value })); };
    const submit = async event => {
        event.preventDefault();
        if (busy || submitting.current || !canWrite) return;
        setError('');
        const title = draft.title.trim(), notes = draft.notes.trim(), content = draft.content.replace(/\r\n?/g, '\n');
        if (!title || title.length > 200 || !content.trim() || content.length > 20000 || draft.notes.length > 2000 || (writing && !notes)) {
            setError('Completá título y texto. El título admite 200 caracteres, el texto 20.000 y el motivo 2.000. Una nueva versión requiere motivo.'); return;
        }
        if (writing && initial.current.number === expectedVersion.current && title === initial.current.title && content === initial.current.content) {
            setError('Modificá el título o el texto antes de guardar una nueva versión.'); return;
        }
        submitting.current = true; onBusyChange(true);
        try {
            requestId.current ||= crypto.randomUUID();
            const payload = { title, content, notes, requestId: requestId.current,
                ...(writing ? { expectedVersion: expectedVersion.current } : {}) };
            const { data } = await axios.post(writing ? api.writings.versions(writing.id) : api.writings.byCase(caseId), payload, auth());
            const saved = data?.selectedVersion;
            if (!validDetail(data, caseId, writing?.id) || saved.requestId !== requestId.current || saved.title !== title ||
                saved.content !== content || (saved.notes || '') !== notes ||
                saved.previousVersion !== (writing ? expectedVersion.current : 0) || saved.number !== (writing ? expectedVersion.current + 1 : 1)) {
                throw new Error('Respuesta inválida');
            }
            notifyActivityChanged();
            onSaved(data);
        } catch (err) {
            if (err.response?.status === 409) setConflict(true);
            setError(await errorMessage(err, 'No se pudo confirmar el escrito. Conservamos tu edición; reintentá con los mismos datos.'));
        } finally { submitting.current = false; onBusyChange(false); }
    };
    if (!canWrite) return <div className="border rounded-lg p-4 space-y-2">
        <p role="alert">Tu cuenta ya no puede guardar escritos.</p><button type="button" onClick={onClose} disabled={busy}>Cerrar edición del escrito</button>
    </div>;
    return <form onSubmit={submit} className="border border-indigo-200 rounded-lg p-4 grid gap-3">
        <h3 className="font-semibold">{writing ? 'Nueva versión del escrito' : 'Nuevo escrito'}</h3>
        {writing && <p>Partís de la versión guardada {initial.current.number}. La versión anterior se conserva.</p>}
        <label>Título del escrito<input required maxLength={200} disabled={busy} value={draft.title} onChange={event => change('title', event.target.value)} className="block border rounded p-2 w-full" /></label>
        <label>Texto del escrito<textarea required maxLength={20000} rows={12} disabled={busy} value={draft.content} onChange={event => change('content', event.target.value)} className="block border rounded p-2 w-full font-serif" /></label>
        <p className="text-sm text-gray-600">{draft.content.length.toLocaleString('es-AR')} de 20.000 caracteres. Se conservan los saltos de línea y las sangrías del texto plano.</p>
        <label>{writing ? 'Motivo de la nueva versión' : 'Nota inicial (opcional)'}<textarea required={!!writing} maxLength={2000} disabled={busy} value={draft.notes} onChange={event => change('notes', event.target.value)} className="block border rounded p-2 w-full" /></label>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {conflict && <button type="button" disabled={busy} className="underline" onClick={onDiscardAndReload}>Descartar edición y actualizar escritos</button>}
        <button disabled={busy} className="bg-indigo-600 text-white rounded p-2">{busy ? 'Guardando escrito…' : writing ? 'Guardar nueva versión' : 'Guardar escrito'}</button>
        <button type="button" disabled={busy} onClick={onClose}>Cancelar edición del escrito</button>
    </form>;
}

function WritingComparison({ writing, busy }) {
    const [first, setFirst] = useState(String(writing.versions[1]?.number || writing.versions[0]?.number));
    const [second, setSecond] = useState(String(writing.versions[0]?.number));
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const generation = useRef(0);
    useEffect(() => () => { ++generation.current; }, []);
    if (writing.versions.length < 2) return <p className="text-sm text-gray-600">La comparación estará disponible al guardar otra versión.</p>;
    const compare = async () => {
        if (busy || loading || first === second) return;
        const current = ++generation.current;
        setLoading(true); setError(''); setResult(null);
        try {
            const versions = await Promise.all([first, second].map(async number => {
                const { data } = await axios.get(api.writings.version(writing.id, number), auth());
                if (!validDetail(data, writing.caseId, writing.id, Number(number))) throw new Error('Respuesta inválida');
                return data.selectedVersion;
            }));
            if (current === generation.current) setResult(versions);
        } catch (err) {
            const message = await errorMessage(err, 'No se pudieron cargar las versiones para comparar.');
            if (current === generation.current) setError(message);
        }
        finally { if (current === generation.current) setLoading(false); }
    };
    return <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Comparar versiones guardadas</h3>
        <div className="flex flex-wrap gap-3">
            <label>Primera versión a comparar<select className="block border rounded p-2" disabled={busy || loading} value={first} onChange={event => { setFirst(event.target.value); setResult(null); }}>
                {writing.versions.map(version => <option key={version.id} value={version.number}>Versión {version.number}</option>)}
            </select></label>
            <label>Segunda versión a comparar<select className="block border rounded p-2" disabled={busy || loading} value={second} onChange={event => { setSecond(event.target.value); setResult(null); }}>
                {writing.versions.map(version => <option key={version.id} value={version.number}>Versión {version.number}</option>)}
            </select></label>
            <button type="button" disabled={busy || loading || first === second} className="underline" onClick={compare}>Comparar versiones</button>
        </div>
        {first === second && <p>Elegí dos versiones distintas.</p>}
        {loading && <p role="status">Cargando comparación…</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {result && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.map(version => <article key={version.id} className="min-w-0 border rounded p-3 space-y-2">
                <h4 className="font-medium">Comparación · versión {version.number}</h4>
                <p>{version.title}</p><p className="text-sm">{time(version.createdAt)} · {version.createdByName}</p>
                <pre className="whitespace-pre-wrap break-words font-serif">{version.content}</pre>
            </article>)}
        </div>}
    </div>;
}

export const WrittenDocumentsPanel = ({ caseId }) => <Writings key={caseId} caseId={caseId} />;

function Writings({ caseId }) {
    const { user } = useAuth();
    const canWrite = ['OPERATOR', 'LAWYER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);
    const [list, setList] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [selection, setSelection] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [editor, setEditor] = useState(null);
    const [busy, setBusy] = useState(false);
    const [reload, setReload] = useState(0);
    const [notice, setNotice] = useState('');
    const [downloadError, setDownloadError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const listGeneration = useRef(0), detailGeneration = useRef(0), mutating = useRef(false);
    const confirmedSelection = useRef(null);
    useEffect(() => {
        if (mutating.current) return;
        let cancelled = false;
        const generation = ++listGeneration.current;
        setListLoading(true); setListError('');
        axios.get(api.writings.byCase(caseId), auth()).then(({ data }) => {
            if (!Array.isArray(data) || data.some(item => item.caseId !== caseId || !validMetadata(item.latestVersion) ||
                item.latestVersion.writingId !== item.id || item.latestVersion.number !== item.currentVersion)) throw new Error('Respuesta inválida');
            if (!cancelled && generation === listGeneration.current) setList(data);
        }).catch(async err => {
            const message = await errorMessage(err, 'No se pudieron cargar los escritos.');
            if (!cancelled && generation === listGeneration.current) setListError(message);
        })
            .finally(() => { if (!cancelled && generation === listGeneration.current) setListLoading(false); });
        return () => { cancelled = true; };
    }, [caseId, reload]);
    const selectedId = selection?.id, selectedNumber = selection?.number;
    useEffect(() => {
        if (!selectedId || mutating.current) return;
        const confirmed = confirmedSelection.current?.id === selectedId && confirmedSelection.current?.number === selectedNumber;
        confirmedSelection.current = null;
        if (confirmed) return;
        let cancelled = false;
        const generation = ++detailGeneration.current;
        setDetailLoading(true); setDetailError(''); setDownloadError('');
        axios.get(selectedNumber ? api.writings.version(selectedId, selectedNumber) : api.writings.get(selectedId), auth()).then(({ data }) => {
            if (!validDetail(data, caseId, selectedId, selectedNumber)) throw new Error('Respuesta inválida');
            if (!cancelled && generation === detailGeneration.current) setDetail(data);
        }).catch(async err => {
            const message = await errorMessage(err, 'No se pudo cargar la versión del escrito.');
            if (!cancelled && generation === detailGeneration.current) setDetailError(message);
        })
            .finally(() => { if (!cancelled && generation === detailGeneration.current) setDetailLoading(false); });
        return () => { cancelled = true; };
    }, [caseId, selectedId, selectedNumber, reload]);
    const changeBusy = value => {
        mutating.current = value; setBusy(value);
        if (value) { ++listGeneration.current; ++detailGeneration.current; setListLoading(false); setDetailLoading(false); setListError(''); setDetailError(''); setNotice(''); }
    };
    const saved = data => {
        const latestVersion = data.versions.find(version => version.number === data.currentVersion);
        setList(current => [{ id: data.id, caseId, currentVersion: data.currentVersion, createdAt: data.createdAt,
            createdById: data.createdById, createdByName: data.createdByName, latestVersion }, ...current.filter(item => item.id !== data.id)]);
        confirmedSelection.current = { id: data.id, number: data.selectedVersion.number };
        setDetail(data); setSelection(confirmedSelection.current); setEditor(null);
        setNotice('Escrito guardado. Versión ' + data.selectedVersion.number + ' disponible.');
    };
    const refresh = () => { confirmedSelection.current = null; setNotice(''); setReload(current => current + 1); };
    const download = async () => {
        if (!detail || busy || downloading) return;
        const writingId = detail.id, version = detail.selectedVersion.number;
        setDownloading(true); setDownloadError('');
        try {
            const { data } = await axios.get(api.writings.word(writingId, version), { ...auth(), responseType: 'blob' });
            if (!(data instanceof Blob) || !data.size || data.type !== WORD_TYPE) throw new Error('Respuesta inválida');
            const url = URL.createObjectURL(data), link = document.createElement('a');
            link.href = url; link.download = 'escrito_version_' + version + '.docx';
            try { document.body.appendChild(link); link.click(); }
            finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
        } catch (err) { setDownloadError(await errorMessage(err, 'No se pudo descargar el Word de la versión guardada.')); }
        finally { setDownloading(false); }
    };
    return <section className="bg-white border rounded-xl p-6 my-6 space-y-4">
        <div className="flex flex-wrap gap-3 justify-between"><h2 className="font-semibold">Escritos y versiones</h2>
            <button type="button" disabled={busy} className="underline" onClick={refresh}>Actualizar escritos</button></div>
        <p className="text-sm text-gray-600">Guardá el texto de trabajo y consultá cada versión con su autor y fecha. Guardar o exportar un escrito no significa aprobarlo ni presentarlo.</p>
        <WritingTemplateLibrary caseId={caseId} canManage={['LAWYER','ADMIN','SUPER_ADMIN'].includes(user?.role)} disabled={busy||!!editor||!canWrite}
            sourceVersion={detail&&!detailLoading&&!detailError&&detail.id===selectedId&&detail.selectedVersion.number===(selectedNumber||detail.currentVersion)?detail.selectedVersion:null} onUse={seed=>{
            ++detailGeneration.current;setSelection(null);setDetail(null);setDetailLoading(false);setDetailError('');setDownloadError('');setEditor({writing:null,seed});setNotice('Modelo preparado. Revisá el texto antes de guardar el escrito.');
        }}/>
        {canWrite && <button type="button" disabled={busy || !!editor} className="underline" onClick={() => {
            ++detailGeneration.current; setSelection(null); setDetail(null); setDetailLoading(false);
            setDetailError(''); setDownloadError(''); setEditor({ writing: null }); setNotice('');
        }}>Nuevo escrito</button>}
        {listLoading && <p role="status">Cargando escritos…</p>}
        {listError && <p role="alert" className="text-red-700">{listError}</p>}
        {!listLoading && !listError && !list.length && <p>No hay escritos guardados.</p>}
        {!!list.length && <ul className="space-y-2" aria-label="Escritos del expediente">{list.map(item => <li key={item.id}>
            <button type="button" disabled={busy || !!editor} className="text-left underline" onClick={() => { setSelection({ id: item.id, number: null }); setNotice(''); }}>
                {item.latestVersion.title} · versión {item.currentVersion}
            </button>
        </li>)}</ul>}
        {detailLoading ? <p role="status">Cargando versión del escrito…</p> : detailError ? <p role="alert" className="text-red-700">{detailError}</p> : detail && <div className="space-y-4">
            <label>Versión guardada<select className="block border rounded p-2" disabled={busy || !!editor} value={detail.selectedVersion.number} onChange={event => setSelection({ id: detail.id, number: Number(event.target.value) })}>
                {detail.versions.map(version => <option key={version.id} value={version.number}>Versión {version.number}{version.number === detail.currentVersion ? ' · última' : ''}</option>)}
            </select></label>
            <article className="border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">{detail.selectedVersion.title}</h3>
                <p className="text-sm">Versión guardada {detail.selectedVersion.number} · {time(detail.selectedVersion.createdAt)} · {detail.selectedVersion.createdByName}</p>
                {detail.selectedVersion.notes && <p className="whitespace-pre-wrap">Motivo o nota: {detail.selectedVersion.notes}</p>}
                <pre className="whitespace-pre-wrap break-words font-serif">{detail.selectedVersion.content}</pre>
                <button type="button" disabled={busy || downloading} className="underline" onClick={download}>{downloading ? 'Preparando Word…' : 'Descargar Word de versión ' + detail.selectedVersion.number + ' guardada'}</button>
                {downloadError && <p role="alert" className="text-red-700">{downloadError}</p>}
            </article>
            {canWrite && <button type="button" disabled={busy || !!editor} className="underline" onClick={() => { setEditor({ writing: detail }); setNotice(''); }}>Crear nueva versión desde la seleccionada</button>}
            <details><summary className="cursor-pointer underline">Historial de versiones del escrito</summary>
                <ol className="space-y-2 mt-2">{detail.versions.map(version => <li key={version.id} className="border rounded p-3">
                    <p>Versión {version.number} · {version.title}</p><p>{time(version.createdAt)} · {version.createdByName}</p>
                    {version.notes && <p className="whitespace-pre-wrap">{version.notes}</p>}
                </li>)}</ol>
            </details>
            <WritingComparison key={detail.id + ':' + detail.currentVersion} writing={detail} busy={busy} />
        </div>}
        {editor && <WritingEditor caseId={caseId} writing={editor.writing} seed={editor.seed} canWrite={canWrite} busy={busy} onBusyChange={changeBusy} onSaved={saved}
            onClose={() => setEditor(null)} onDiscardAndReload={() => { setEditor(null); refresh(); }} />}
        {notice && <p role="status" className="text-green-700">{notice}</p>}
    </section>;
}
