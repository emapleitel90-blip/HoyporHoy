import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { NativeSelect } from './ui/native-select';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';

const portals = [
    ['SAIJ', 'https://www.saij.gob.ar/buscador/'],
    ['Poder Judicial de Córdoba', 'https://www.justiciacordoba.gob.ar/Jurisprudencia/home'],
];
const empty = { titulo: '', tribunal: '', fecha: '', url: '', extracto: '' };
const headers = () => ({ Authorization: 'Bearer ' + localStorage.getItem('lyp_token') });
const searchable = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const JurisprudencePanel = ({ caseId }) => <CaseReferences key={caseId} caseId={caseId} />;

function CaseReferences({ caseId }) {
    const [references, setReferences] = useState([]);
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [retry, setRetry] = useState(0);
    const [query, setQuery] = useState('');
    const [origin, setOrigin] = useState('ALL');
    const visible = references.filter(item => {
        const official = item.verification === 'USER_PROVIDED';
        return (origin === 'ALL' || (origin === 'OFFICIAL' ? official : !official)) &&
            searchable([item.titulo,item.tribunal,item.fecha,item.source,item.extracto,item.title,item.description].join(' ')).includes(searchable(query.trim()));
    });

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setLoadError('');
        axios.get(api.jurisprudence.byCase(caseId), { headers: headers() })
            .then(({ data }) => {
                if (!Array.isArray(data)) throw new Error('Respuesta inválida');
                if (!cancelled) setReferences(data);
            })
            .catch(() => { if (!cancelled) setLoadError('No se pudieron cargar las referencias.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [caseId, retry]);

    const save = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setSaveError('');
        setNotice('');
        try {
            const { data } = await axios.post(api.jurisprudence.save,
                { caseId, insightData: form }, { headers: headers() });
            if (!data?.id || data.verification !== 'USER_PROVIDED') throw new Error('Respuesta inválida');
            notifyActivityChanged();
            setReferences(previous => [data, ...previous]);
            setForm(empty);
            setNotice('Referencia guardada en el expediente.');
        } catch (error) {
            setSaveError(error.response?.data?.message || 'No se pudo guardar. Conservamos los datos para reintentar.');
        } finally { setSaving(false); }
    };

    return (
        <section className="bg-card rounded-xl border border-border p-6 mt-6 space-y-4">
            <h3 className="font-semibold text-foreground">Jurisprudencia · fuentes oficiales</h3>
            <p className="text-sm text-secondary-foreground">Buscá en los portales oficiales y copiá el enlace del documento consultado. La app no realiza consultas a IA ni recupera o verifica fallos automáticamente.</p>
            <div className="flex flex-wrap gap-4">
                {portals.map(([name, url]) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-link underline">Abrir {name}</a>)}
            </div>
            <p className="text-xs text-muted-foreground">El portal de Córdoba ofrece su propio buscador semántico. Abrir un portal no envía datos del expediente desde esta app.</p>
            <h4 className="font-medium">Registrar referencia consultada</h4>
            <p className="text-sm text-secondary-foreground">Se guardan los datos que ingreses, con fecha de registro y usuario. Un dominio oficial no acredita por sí solo el contenido de un fallo.</p>
            <form onSubmit={save} className="grid gap-3">
                {[
                    ['titulo', 'Título del fallo', 'text', 300],
                    ['tribunal', 'Tribunal', 'text', 300],
                    ['fecha', 'Fecha del fallo', 'date', undefined],
                    ['url', 'Enlace oficial del documento', 'url', 2000],
                ].map(([field, label, type, maxLength]) => (
                    <Label key={field} className="text-sm grid gap-1">{label}
                        <Input type={type} maxLength={maxLength} required disabled={saving} value={form[field]}
                            onChange={event => setForm({ ...form, [field]: event.target.value })}
                            className="border rounded-lg p-2" />
                    </Label>
                ))}
                <Label className="text-sm grid gap-1">Extracto o notas de lectura (opcional)
                    <Textarea maxLength={5000} disabled={saving} value={form.extracto}
                        onChange={event => setForm({ ...form, extracto: event.target.value })}
                        className="border rounded-lg p-2" />
                </Label>
                <p className="text-xs text-muted-foreground">Enlaces admitidos: saij.gob.ar y justiciacordoba.gob.ar, con HTTPS.</p>
                <Button variant="legacy" size="legacy" disabled={saving || loading || !!loadError} className="bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
                    {saving ? 'Guardando…' : 'Guardar referencia'}
                </Button>
            </form>
            {saveError && <p role="alert" className="text-status-red">{saveError}</p>}
            {notice && <p role="status" className="text-status-green">{notice}</p>}
            <h4 className="font-medium">Referencias del expediente</h4>
            {!!references.length && <div className="grid gap-3">
                <Label className="text-sm grid gap-1">Buscar en referencias guardadas
                    <Input type="search" value={query} onChange={event => setQuery(event.target.value)} className="border rounded-lg p-2" placeholder="Título, tribunal, fecha o notas" />
                </Label>
                <Label className="text-sm grid gap-1">Origen del registro
                    <NativeSelect value={origin} onChange={event => setOrigin(event.target.value)} className="border rounded-lg p-2">
                        <option value="ALL">Todos los registros</option>
                        <option value="OFFICIAL">Referencias oficiales ingresadas por el usuario</option>
                        <option value="HISTORICAL">Registros históricos sin verificar</option>
                    </NativeSelect>
                </Label>
                <p role="status">{visible.length} de {references.length} referencias</p>
                {(query || origin !== 'ALL') && <Button variant="legacy" size="legacy" type="button" className="underline text-left" onClick={() => {setQuery('');setOrigin('ALL');}}>Limpiar filtros de referencias</Button>}
            </div>}
            {loading && <p role="status">Cargando referencias…</p>}
            {loadError && <div role="alert">{loadError} <Button variant="legacy" size="legacy" onClick={() => setRetry(value => value + 1)} className="underline">Reintentar carga</Button></div>}
            {!loading && !loadError && references.length === 0 && <p className="text-sm text-muted-foreground">Sin referencias guardadas.</p>}
            {!loading && !loadError && !!references.length && !visible.length && <p>No hay referencias que coincidan con los filtros.</p>}
            {visible.map(item => (
                <article key={item.id} className="border rounded-lg p-4 space-y-2">
                    {item.verification === 'USER_PROVIDED' ? <>
                        <h5 className="font-semibold">{item.titulo}</h5>
                        <p className="text-sm">{item.tribunal} · {item.fecha} · {item.source}</p>
                        <p className="text-xs text-muted-foreground">Cargada por el usuario · contenido sin verificación automática</p>
                        <p className="whitespace-pre-wrap text-sm">{item.extracto}</p>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-link underline">Consultar documento oficial</a>
                    </> : <>
                        <h5>{item.title}</h5>
                        <p className="text-xs text-status-amber">Registro histórico sin verificar</p>
                        <p className="whitespace-pre-wrap text-sm">{item.description}</p>
                    </>}
                </article>
            ))}
        </section>
    );
}
