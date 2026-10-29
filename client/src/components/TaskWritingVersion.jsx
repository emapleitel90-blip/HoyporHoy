import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../config/api';
const auth = () => ({ headers: { Authorization: 'Bearer ' + localStorage.getItem('lyp_token') } });
export function TaskWritingVersion({ caseId, onSelect, selected, fixed, onReady }) {
    const readyCallback = useRef(onReady);
    readyCallback.current = onReady;
    const [list, setList] = useState([]), [writing, setWriting] = useState(''), [versions, setVersions] = useState([]);
    const [snapshot, setSnapshot] = useState(null), [error, setError] = useState('');
    useEffect(() => {
        if (fixed) return;
        let cancelled = false;
        axios.get(api.writings.byCase(caseId), auth()).then(({data}) => { if (!cancelled) setList(data); })
            .catch(() => { if (!cancelled) setError('No se pudieron cargar los escritos.'); });
        return () => { cancelled = true; };
    }, [caseId, fixed]);
    useEffect(() => {
        if (!writing || fixed) return;
        let cancelled = false;
        axios.get(api.writings.get(writing), auth()).then(({data}) => { if (!cancelled) setVersions(data.versions); })
            .catch(() => { if (!cancelled) setError('No se pudieron cargar las versiones.'); });
        return () => { cancelled = true; };
    }, [writing, fixed]);
    const version = fixed || versions.find(item => item.id === selected);
    const writingId = version?.writingId, number = version?.number, versionId = version?.id;
    useEffect(() => {
        let cancelled = false;
        setSnapshot(null); setError(''); readyCallback.current?.(false);
        if (!writingId || !number) return;
        axios.get(api.writings.version(writingId, number), auth()).then(({data}) => {
            if (data.caseId !== caseId || data.selectedVersion?.id !== versionId) throw new Error();
            if (!cancelled) { setSnapshot(data.selectedVersion); readyCallback.current?.(true); }
        }).catch(() => { if (!cancelled) setError('No se pudo consultar la versión entregada.'); });
        return () => { cancelled = true; };
    }, [caseId, writingId, number, versionId]);
    return <div className="border rounded p-3 space-y-2">
        {!fixed && <><label>Escrito para entregar<select className="block w-full border p-2" value={writing} onChange={e => {setWriting(e.target.value);setVersions([]);onSelect('');}}>
            <option value="">Sin escrito seleccionado</option>{list.map(item => <option key={item.id} value={item.id}>{item.latestVersion.title}</option>)}
        </select></label><label>Versión para entregar<select className="block w-full border p-2" value={selected || ''} onChange={e => onSelect(e.target.value)}>
            <option value="">Seleccioná una versión guardada</option>{versions.map(item => <option key={item.id} value={item.id}>Versión {item.number} · {item.title}</option>)}
        </select></label></>}
        {error && <p role="alert">{error}</p>}
        {snapshot && <article><h4 className="font-semibold">{snapshot.title} · versión {snapshot.number}</h4><pre className="whitespace-pre-wrap break-words font-serif">{snapshot.content}</pre></article>}
    </div>;
}
