import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import React, { useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../config/api';

const money = cents => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100);
const day = value => new Date(value).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
const timestamp = value => new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
const amountCents = value => {
    if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ''] = value.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return cents > 0 && cents <= 2000000000 ? cents : null;
};

export function FeeAgreementEditor({ agreement, busy, onBusyChange, onSaved, onCancel, onDiscardAndReload }) {
    // Preserve the exact version opened by the user, even if the parent refreshes.
    const [draft, setDraft] = useState(() => ({
        expectedVersion: agreement.version,
        originalCount: agreement.installments.length,
        description: agreement.description,
        installments: agreement.installments.map(item => ({ id: item.id, amount: (item.amountCents / 100).toFixed(2),
            dueDate: item.dueDate.slice(0, 10), paidCents: item.paidCents })),
    }));
    const originalCount = draft.originalCount;
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const requestId = useRef(null);
    const change = next => { requestId.current = null; setDraft(next); };
    const changeQuota = (index, field, value) => change({ ...draft, installments: draft.installments.map((item, i) => i === index ? { ...item, [field]: value } : item) });

    const submit = async event => {
        event.preventDefault();
        if (busy) return;
        setError('');
        if (!reason.trim() || reason.length > 2000 || !draft.description.trim() || draft.description.length > 2000) {
            setError('Completá la descripción y el motivo del cambio, de hasta 2000 caracteres.');
            return;
        }
        if (draft.installments.some(item => amountCents(item.amount) === null || amountCents(item.amount) < item.paidCents || !item.dueDate)) {
            setError('Completá cada vencimiento y un importe válido. Ninguna cuota puede ser menor que lo ya abonado.');
            return;
        }
        if (!Number.isSafeInteger(draft.expectedVersion) || draft.expectedVersion < 1) {
            setError('Actualizá el acuerdo antes de modificarlo.'); setConflict(true); return;
        }
        onBusyChange(true);
        try {
            requestId.current ||= crypto.randomUUID();
            const payload = { expectedVersion: draft.expectedVersion, description: draft.description.trim(), reason: reason.trim(),
                requestId: requestId.current, installments: draft.installments.map(({ id, amount, dueDate }) => ({ ...(id ? { id } : {}), amount, dueDate })) };
            const { data } = await axios.post(api.fees.amend(agreement.caseId), payload,
                { headers: { Authorization: 'Bearer ' + localStorage.getItem('lyp_token') } });
            const amendment = Array.isArray(data?.amendments) && data.amendments.find(item => item.requestId === requestId.current);
            if (data?.caseId !== agreement.caseId || !Array.isArray(data?.installments) || !amendment || amendment.reason !== payload.reason ||
                amendment.previousVersion !== draft.expectedVersion || amendment.version !== draft.expectedVersion + 1 ||
                !Number.isInteger(data.version) || data.version < amendment.version) throw new Error('Respuesta inválida');
            onSaved(data);
        } catch (err) {
            const stale = err.response?.status === 409;
            if (stale) setConflict(true);
            setError(stale ? 'El acuerdo o sus pagos cambiaron. Conservamos tu edición. Actualizá el acuerdo antes de volver a guardar.'
                : err.response?.data?.message || 'No se pudo confirmar el cambio. Conservamos la edición; reintentá con los mismos datos.');
        } finally { onBusyChange(false); }
    };

    return <form onSubmit={submit} className="border border-ring rounded-lg p-4 grid gap-3">
        <h3 className="font-semibold">Modificar acuerdo y cuotas</h3>
        <p className="text-sm">Cada cambio conserva sus valores anteriores, motivo, autor y fecha. Los pagos registrados mantienen su historial.</p>
        <Label>Descripción actualizada del acuerdo<Textarea required maxLength={2000} disabled={busy} className="block border rounded p-2 w-full" value={draft.description}
            onChange={event => change({ ...draft, description: event.target.value })} /></Label>
        {draft.installments.map((item, index) => <fieldset key={item.id || 'new-' + index} className="border rounded p-3 flex flex-wrap gap-3">
            <legend>Cuota {index + 1}{index >= originalCount ? ' · nueva' : ''}</legend>
            <Label>Nuevo importe de cuota {index + 1}<Input type="number" min={Math.max(1, item.paidCents) / 100} max="20000000" step="0.01" required disabled={busy}
                className="block border rounded p-2" value={item.amount} onChange={event => changeQuota(index, 'amount', event.target.value)} /></Label>
            <Label>Nuevo vencimiento de cuota {index + 1}<Input type="date" required disabled={busy} className="block border rounded p-2" value={item.dueDate}
                onChange={event => changeQuota(index, 'dueDate', event.target.value)} /></Label>
            <p className="text-sm w-full">Ya abonado: {money(item.paidCents)}. Se conserva el número y el historial de esta cuota.</p>
            {index >= originalCount && <Button variant="legacy" size="legacy" type="button" disabled={busy} onClick={() => change({ ...draft, installments: draft.installments.filter((_, i) => i !== index) })}>Quitar nueva cuota {index + 1}</Button>}
        </fieldset>)}
        <Button variant="legacy" size="legacy" type="button" disabled={busy || draft.installments.length >= 60} onClick={() => change({ ...draft,
            installments: [...draft.installments, { amount: '', dueDate: '', paidCents: 0 }] })}>Agregar cuota al acuerdo</Button>
        <Label>Motivo del cambio<Textarea required maxLength={2000} disabled={busy} className="block border rounded p-2 w-full" value={reason}
            onChange={event => { requestId.current = null; setReason(event.target.value); }} /></Label>
        {error && <p role="alert" className="text-status-red">{error}</p>}
        {conflict && <Button variant="legacy" size="legacy" type="button" disabled={busy} className="underline" onClick={onDiscardAndReload}>Descartar edición y actualizar acuerdo</Button>}
        <Button variant="legacy" size="legacy" disabled={busy} className="bg-indigo-600 text-white rounded p-2">{busy ? 'Guardando cambio…' : 'Guardar cambios del acuerdo'}</Button>
        <Button variant="legacy" size="legacy" type="button" disabled={busy} onClick={onCancel}>Cancelar edición del acuerdo</Button>
    </form>;
}

export function FeeAgreementHistory({ amendments = [] }) {
    if (!amendments.length) return null;
    return <section className="space-y-3">
        <h3 className="font-semibold">Historial de cambios del acuerdo</h3>
        {amendments.map(entry => <article key={entry.id} className="border rounded-lg p-4 space-y-2">
            <h4>Versión {entry.previousVersion} → {entry.version}</h4>
            <p className="text-sm">{timestamp(entry.createdAt)} · {entry.registeredByName || entry.registeredById}</p>
            <p className="whitespace-pre-wrap">Motivo del cambio: {entry.reason}</p>
            <details>
                <summary className="cursor-pointer underline">Ver valores anteriores y nuevos de versión {entry.version}</summary>
                <div className="grid gap-4 md:grid-cols-2 pt-3">
                    {[['Antes del cambio', entry.before], ['Después del cambio', entry.after]].map(([label, snapshot]) => <div key={label}>
                        <h5 className="font-medium">{label}</h5>
                        <p className="whitespace-pre-wrap">Descripción: {snapshot?.description}</p>
                        <ul className="text-sm space-y-1">{snapshot?.installments?.map(item => <li key={item.id}>
                            Cuota {item.position}: {money(item.amountCents)} · {day(item.dueDate)} · Abonado al cambiar: {money(item.paidCents)}
                        </li>)}</ul>
                    </div>)}
                </div>
            </details>
        </article>)}
    </section>;
}
