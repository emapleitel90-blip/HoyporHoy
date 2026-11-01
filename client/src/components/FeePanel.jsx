import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { FeeAgreementEditor, FeeAgreementHistory } from './FeeAgreementEditor';
import { FeePaymentReceipts, FeePaymentReceiptEditor } from './FeePaymentReceipts';

const auth = () => ({ headers: { Authorization: 'Bearer ' + localStorage.getItem('lyp_token') } });
const currency = cents => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(cents / 100);
const day = value => new Date(value).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
const moment = value => new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba' }).format(new Date());
const blankQuota = () => ({ amount: '', dueDate: '' });

export const FeePanel = ({ caseId, inbox = false, onReceiptSaved, onChanged }) => <Fees key={inbox ? 'inbox' : caseId} caseId={caseId} inbox={inbox} onReceiptSaved={onReceiptSaved} onChanged={onChanged} />;

function Fees({ caseId, inbox, onReceiptSaved, onChanged }) {
    const { user } = useAuth();
    const canWrite = ['LAWYER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [reload, setReload] = useState(0);
    const [description, setDescription] = useState('');
    const [quotas, setQuotas] = useState([blankQuota()]);
    const [selected, setSelected] = useState(null);
    const [payment, setPayment] = useState({ amount: '', paidAt: today(), notes: '' });
    const requestId = useRef(null);
    const [reversing, setReversing] = useState(null);
    const [reason, setReason] = useState('');
    const reversalRequestId = useRef(null);
    const [editingAgreement, setEditingAgreement] = useState(null);
    const [receiptEditing, setReceiptEditing] = useState(null);
    const loadGeneration = useRef(0);
    const mutating = useRef(false);
    useEffect(() => {
        if (mutating.current) return;
        let cancelled = false;
        const generation = ++loadGeneration.current;
        setLoading(true); setError('');
        axios.get(inbox ? api.fees.upcoming : api.fees.byCase(caseId), auth()).then(({ data: result }) => {
            if (inbox ? !Array.isArray(result) : result !== null && !Array.isArray(result?.installments)) throw new Error('Respuesta inválida');
            if (!cancelled && generation === loadGeneration.current) setData(result);
        }).catch(err => { if (!cancelled && generation === loadGeneration.current) setError(err.response?.data?.message || 'No se pudieron cargar los honorarios.'); })
            .finally(() => { if (!cancelled && generation === loadGeneration.current) setLoading(false); });
        return () => { cancelled = true; };
    }, [caseId, inbox, reload]);

    const changeBusy = value => {
        mutating.current = value;
        if (value) {
            // A mutation supersedes any earlier GET, including its error/finally handlers.
            ++loadGeneration.current;
            setLoading(false); setError('');
        }
        setBusy(value);
    };

    const create = async event => {
        event.preventDefault();
        if (busy) return;
        changeBusy(true); setSaveError(''); setNotice('');
        try {
            const response = await axios.post(api.fees.byCase(caseId), { description, installments: quotas }, auth());
            if (!Array.isArray(response.data?.installments)) throw new Error('Respuesta inválida');
            setData(response.data); onChanged?.(); setNotice('Acuerdo guardado.');
        } catch (err) { setSaveError(err.response?.data?.message || 'No se pudo guardar el acuerdo. Los datos se conservan.'); }
        finally { changeBusy(false); }
    };
    const pay = async event => {
        event.preventDefault();
        if (busy) return;
        changeBusy(true); setSaveError(''); setNotice('');
        try {
            requestId.current ||= crypto.randomUUID();
            const response = await axios.post(api.fees.payment(selected), { ...payment, requestId: requestId.current }, auth());
            if (!Array.isArray(response.data?.installments)) throw new Error('Respuesta inválida');
            setData(response.data); onChanged?.(); setSelected(null); requestId.current = null;
            setNotice('Pago registrado. Saldo actualizado.');
        } catch (err) { setSaveError(err.response?.data?.message || 'No se pudo confirmar el pago. Reintentá con los mismos datos para evitar duplicados.'); }
        finally { changeBusy(false); }
    };
    const reverse = async event => {
        event.preventDefault();
        if (busy) return;
        const trimmedReason = reason.trim();
        setSaveError(''); setNotice('');
        if (!trimmedReason || reason.length > 2000) {
            setSaveError('Ingresá un motivo de anulación de hasta 2000 caracteres.');
            return;
        }
        changeBusy(true);
        try {
            reversalRequestId.current ||= crypto.randomUUID();
            const response = await axios.post(api.fees.reversePayment(reversing.id),
                { reason: trimmedReason, requestId: reversalRequestId.current }, auth());
            const reversedPayment = response.data?.installments?.flatMap(item => item.payments || [])
                .find(entry => entry.id === reversing.id);
            if (!Array.isArray(response.data?.installments) || reversedPayment?.reversal?.requestId !== reversalRequestId.current ||
                reversedPayment.reversal.reason !== trimmedReason) throw new Error('Respuesta inválida');
            setData(response.data); onChanged?.(); setReversing(null); setReason(''); reversalRequestId.current = null;
            setNotice('Pago anulado. Saldo y recordatorios actualizados.');
        } catch (err) { setSaveError(err.response?.data?.message || 'No se pudo confirmar la anulación. Conservamos el motivo; reintentá con los mismos datos.'); }
        finally { changeBusy(false); }
    };
    const reminder = async item => {
        setSaveError(''); setNotice('');
        const message = 'Recordatorio de honorarios: cuota ' + item.position + ', vencimiento ' + day(item.dueDate) +
            ', saldo pendiente ' + currency(item.balanceCents) + '. Si ya abonaste, por favor enviá el comprobante para registrar el pago.';
        try { await navigator.clipboard.writeText(message); setNotice('Recordatorio copiado. Revisalo antes de enviarlo.'); }
        catch { setSaveError('No se pudo copiar el recordatorio.'); }
    };
    const currentReceiptPayment = receiptEditing && data?.installments?.flatMap(item => item.payments || [])
        .find(item => item.id === receiptEditing.payment.id);
    const receiptBlock = !canWrite ? 'Tu cuenta ya no puede adjuntar comprobantes de pagos.'
        : currentReceiptPayment?.reversal ? 'El pago está anulado. Sus comprobantes se conservan para consulta.'
            : receiptEditing && !currentReceiptPayment ? 'El pago ya no está disponible. Actualizá los honorarios.' : '';

    return <section id={inbox?undefined:'case-fees'} className="bg-white border rounded-xl p-6 my-6 space-y-4 scroll-mt-24">
        <div className="flex flex-wrap gap-3 justify-between"><h2 className="font-semibold">{inbox ? 'Honorarios por cobrar · próximos 7 días y atrasados' : 'Honorarios y cobranzas'}</h2>
            <button disabled={busy} onClick={() => setReload(value => value + 1)} className="underline">Actualizar honorarios</button></div>
        <p className="text-sm text-gray-600">Importes en pesos argentinos. Los honorarios del cliente se registran separados de los gastos del expediente.</p>
        {loading ? <p role="status">Cargando honorarios…</p> : error ? <p role="alert">{error}</p> : inbox ? <>
            {!data?.length && <p>Sin cuotas pendientes en este período.</p>}
            {data?.map(item => <article key={item.id} className="border rounded-lg p-3 space-y-2">
                <Link className="text-indigo-700 underline" to={'/cases/' + item.case.id}>{item.case.clientName || item.case.caseNumber}</Link>
                <p>Cuota {item.position} · {day(item.dueDate)} · Pendiente {currency(item.balanceCents)}</p>
                <button className="underline" onClick={() => reminder(item)}>Copiar recordatorio de cuota {item.position}</button>
            </article>)}
        </> : data ? <>
            <p className="whitespace-pre-wrap">{data.description}</p>
            <p>Total acordado: {currency(data.totalCents)} · Pagado: {currency(data.paidCents)} · Saldo: {currency(data.balanceCents)}</p>
            {canWrite && <button disabled={busy || !!editingAgreement} className="underline" onClick={() => {
                setReceiptEditing(null); setEditingAgreement(data); setSelected(null); setReversing(null); setSaveError(''); setNotice('');
            }}>Modificar acuerdo</button>}
            {data.installments.map(item => <article key={item.id} className="border rounded-lg p-4 space-y-2">
                <h3>Cuota {item.position} · {day(item.dueDate)}</h3>
                <p>Importe {currency(item.amountCents)} · Pendiente {currency(item.balanceCents)} · {item.status === 'PAID' ? 'Pagada' : item.status === 'PARTIAL' ? 'Pago parcial' : 'Pendiente'}</p>
                {item.payments.map((entry, index) => <div key={entry.id} className="text-sm border-l-2 pl-3 space-y-1">
                    <p>Pago {currency(entry.amountCents)} · {day(entry.paidAt)} · {entry.notes || 'Sin observaciones'}</p>
                    {entry.reversal ? <>
                        <p className="font-medium text-amber-800">Anulado · {moment(entry.reversal.createdAt)} · {entry.reversal.registeredByName || entry.reversal.registeredById}</p>
                        <p className="whitespace-pre-wrap">Motivo: {entry.reversal.reason}</p>
                    </> : canWrite && <button disabled={busy} className="underline text-red-700" onClick={() => {
                        setReceiptEditing(null); setEditingAgreement(null); setSelected(null); setReversing({ id: entry.id, amountCents: entry.amountCents, position: item.position });
                        setReason(''); reversalRequestId.current = null; setSaveError(''); setNotice('');
                    }}>Anular pago {index + 1} de cuota {item.position}</button>}
                    <FeePaymentReceipts payment={entry} label={'pago ' + (index + 1) + ' de cuota ' + item.position}
                        canWrite={canWrite} busy={busy} editing={receiptEditing?.payment.id === entry.id}
                        onEdit={() => { setReceiptEditing({ payment: entry, label: 'pago ' + (index + 1) + ' de cuota ' + item.position, version: data.version });
                            setSelected(null); setReversing(null); setEditingAgreement(null); setSaveError(''); setNotice(''); }} />
                </div>)}
                {item.balanceCents > 0 && <div className="flex flex-wrap gap-4">
                    <button disabled={busy} className="underline" onClick={() => reminder(item)}>Copiar recordatorio de cuota {item.position}</button>
                    {canWrite && <button disabled={busy} className="underline" onClick={() => { setReceiptEditing(null); setEditingAgreement(null); setReversing(null); setSelected(item.id); requestId.current = null; setPayment({ amount: '', paidAt: today(), notes: '' }); setSaveError(''); setNotice(''); }}>Registrar pago de cuota {item.position}</button>}
                </div>}
            </article>)}
            {reversing && <form onSubmit={reverse} className="border border-amber-200 rounded-lg p-4 grid gap-3">
                <h3>Anular pago de {currency(reversing.amountCents)} de cuota {reversing.position}</h3>
                <p>La anulación vuelve a aumentar el saldo pendiente en {currency(reversing.amountCents)}. El pago original y el motivo se conservan en el historial. Después podés registrar el importe correcto como un nuevo pago.</p>
                <label>Motivo de anulación<textarea className="block border rounded p-2 w-full" required maxLength={2000} disabled={busy} value={reason}
                    onChange={event => { reversalRequestId.current = null; setReason(event.target.value); }} /></label>
                <button disabled={busy} className="bg-red-700 text-white rounded p-2">{busy ? 'Anulando…' : 'Confirmar anulación'}</button>
                <button type="button" disabled={busy} onClick={() => { setReversing(null); setSaveError(''); }}>Cancelar anulación</button>
            </form>}
            {selected && <form onSubmit={pay} className="border rounded-lg p-4 grid gap-3">
                <h3>Registrar pago recibido</h3>
                {[['amount', 'Importe del pago', 'number'], ['paidAt', 'Fecha del pago', 'date'], ['notes', 'Observaciones del pago', 'text']].map(([field, label, type]) => <label key={field}>{label}
                    <input className="block border rounded p-2 w-full" type={type} step={field === 'amount' ? '0.01' : undefined} min={field === 'amount' ? '0.01' : undefined}
                        maxLength={2000} required={field !== 'notes'} disabled={busy} value={payment[field]} onChange={event => { requestId.current = null; setPayment({ ...payment, [field]: event.target.value }); }} />
                </label>)}
                <button disabled={busy} className="bg-indigo-600 text-white rounded p-2">{busy ? 'Registrando…' : 'Confirmar pago'}</button>
                <button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar pago</button>
            </form>}
            <FeeAgreementHistory amendments={data.amendments} />
        </> : canWrite ? <form onSubmit={create} className="grid gap-3">
            <p>Registrá el acuerdo y sus cuotas tal como fueron pactados. Máximo 60 cuotas y $20.000.000 por cuota.</p>
            <label>Descripción del acuerdo<textarea className="block border rounded p-2 w-full" required maxLength={2000} disabled={busy} value={description} onChange={event => setDescription(event.target.value)} /></label>
            {quotas.map((item, index) => <div key={index} className="flex flex-wrap gap-3 border p-3 rounded">
                <label>Importe de cuota {index + 1}<input className="block border rounded p-2" type="number" min="0.01" max="20000000" step="0.01" required disabled={busy} value={item.amount}
                    onChange={event => setQuotas(quotas.map((row, i) => i === index ? { ...row, amount: event.target.value } : row))} /></label>
                <label>Vencimiento de cuota {index + 1}<input className="block border rounded p-2" type="date" required disabled={busy} value={item.dueDate}
                    onChange={event => setQuotas(quotas.map((row, i) => i === index ? { ...row, dueDate: event.target.value } : row))} /></label>
                {quotas.length > 1 && <button type="button" disabled={busy} onClick={() => setQuotas(quotas.filter((_, i) => i !== index))}>Quitar cuota {index + 1}</button>}
            </div>)}
            <button type="button" disabled={busy || quotas.length >= 60} onClick={() => setQuotas([...quotas, blankQuota()])}>Agregar cuota</button>
            <button disabled={busy} className="bg-indigo-600 text-white rounded p-2">{busy ? 'Guardando…' : 'Guardar acuerdo'}</button>
        </form> : <p>Aún no hay acuerdo de honorarios registrado. Puede registrarlo un abogado o administrador.</p>}
        {receiptEditing && <FeePaymentReceiptEditor key={receiptEditing.payment.id} payment={receiptEditing.payment} label={receiptEditing.label}
            caseId={caseId} agreementVersion={receiptEditing.version} busy={busy} onBusyChange={changeBusy} blockedReason={receiptBlock}
            onClose={() => setReceiptEditing(null)} onRefresh={() => { setReceiptEditing(null); setReload(value => value + 1); }}
            onSaved={(agreement, file) => { setData(agreement); setReceiptEditing(null); setNotice('Comprobante guardado.'); onReceiptSaved?.(file); }} />}
        {editingAgreement && <FeeAgreementEditor agreement={editingAgreement} busy={busy} onBusyChange={changeBusy}
            onSaved={result => { setData(result); onChanged?.(); setEditingAgreement(null); setNotice('Acuerdo modificado. Saldo y recordatorios actualizados.'); }}
            onCancel={() => setEditingAgreement(null)} onDiscardAndReload={() => { setEditingAgreement(null); setReload(value => value + 1); }} />}
        {saveError && <p role="alert" className="text-red-700">{saveError}</p>}
        {notice && <p role="status" className="text-green-700">{notice}</p>}
    </section>;
}
