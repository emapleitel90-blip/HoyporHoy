import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import React, { useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { downloadCaseFile, errorMessage, isPrivateFile } from '../utils/caseFiles';

const time = value => new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Cordoba' });
const MAX_SIZE = 20 * 1024 * 1024;
const FORMATS = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp';

export function FeePaymentReceipts({ payment, label, canWrite, busy, editing, onEdit }) {
    const [downloadError, setDownloadError] = useState('');
    const [downloading, setDownloading] = useState(null);
    const receipts = payment.receipts || [];
    const download = async receipt => {
        if (downloading) return;
        setDownloading(receipt.id); setDownloadError('');
        try { await downloadCaseFile(receipt.file); }
        catch (error) { setDownloadError(await errorMessage(error, 'No se pudo descargar el comprobante.')); }
        finally { setDownloading(null); }
    };
    const receiptRow = (receipt, current) => <article key={receipt.id} className="border rounded-lg p-3 space-y-1">
        <p className="font-medium">{current ? 'Comprobante actual' : 'Comprobante anterior'} · {receipt.file?.name}</p>
        <p>{time(receipt.createdAt)} · {receipt.uploadedByName || receipt.uploadedById}</p>
        {receipt.reason && <p className="whitespace-pre-wrap">Motivo del reemplazo: {receipt.reason}</p>}
        {receipt.fileStatus === 'AVAILABLE' && receipt.file && isPrivateFile(receipt.file)
            ? <Button variant="legacy" size="legacy" type="button" className="underline" disabled={busy || !!downloading} onClick={() => download(receipt)}>
                {downloading === receipt.id ? 'Descargando…' : 'Descargar comprobante ' + receipt.sequence + ' de ' + label}
            </Button>
            : <p className="text-status-amber">El archivo de este comprobante no está disponible.</p>}
    </article>;

    return <div className="mt-3 space-y-2">
        {!receipts.length ? <p>Sin comprobante adjunto.</p> : receiptRow(receipts[0], true)}
        {receipts.length > 1 && <details>
            <summary className="cursor-pointer underline">Comprobantes anteriores de {label}</summary>
            <div className="space-y-2 mt-2">{receipts.slice(1).map(item => receiptRow(item, false))}</div>
        </details>}
        {payment.reversal && receipts.length > 0 && <p className="text-status-amber">Pago anulado: se conservan los comprobantes como parte del historial.</p>}
        {canWrite && !payment.reversal && !editing && <Button variant="legacy" size="legacy" type="button" disabled={busy} onClick={onEdit} className="underline">
            {receipts.length ? 'Reemplazar comprobante de ' : 'Adjuntar comprobante a '}{label}
        </Button>}
        {downloadError && <p role="alert" className="text-status-red">{downloadError}</p>}
    </div>;
}

export function FeePaymentReceiptEditor({ payment, label, caseId, agreementVersion, busy, onBusyChange, onClose, onSaved, onRefresh, blockedReason = '' }) {
    const [file, setFile] = useState(null);
    const [expectedVersion, setExpectedVersion] = useState(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const [progress, setProgress] = useState(null);
    const requestId = useRef(null);
    const replacing = (payment.receipts || []).length > 0;
    const choose = event => {
        const selected = event.target.files?.[0];
        event.target.value = '';
        if (!selected) return;
        requestId.current = null; setError(''); setProgress(null);
        setFile(null); setExpectedVersion(null);
        if (!selected.size || selected.size > MAX_SIZE || !/\.(pdf|docx?|xlsx?|png|jpe?g|webp)$/i.test(selected.name)) {
            setError('Elegí un archivo válido de hasta 20 MB: PDF, Word, Excel, PNG, JPG o WebP.'); return;
        }
        setFile(selected); setExpectedVersion(agreementVersion);
    };
    const submit = async event => {
        event.preventDefault();
        if (busy || blockedReason) return;
        setError('');
        if (!file || (replacing && !reason.trim()) || reason.length > 2000) {
            setError('Seleccioná un archivo e indicá un motivo de hasta 2000 caracteres si reemplazás un comprobante.'); return;
        }
        if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
            setConflict(true); setError('Actualizá los honorarios antes de adjuntar un comprobante.'); return;
        }
        onBusyChange(true); setProgress(null);
        try {
            requestId.current ||= crypto.randomUUID();
            const payload = new FormData();
            payload.append('file', file);
            payload.append('expectedVersion', String(expectedVersion));
            payload.append('requestId', requestId.current);
            payload.append('reason', reason.trim());
            const { data } = await axios.post(api.fees.receipt(payment.id), payload, {
                headers: { Authorization: 'Bearer ' + localStorage.getItem('lyp_token') },
                onUploadProgress: event => { if (event.total > 0) setProgress(Math.min(100, Math.round(event.loaded * 100 / event.total))); },
            });
            const stored = data?.installments?.flatMap(item => item.payments || []).find(item => item.id === payment.id)
                ?.receipts?.find(item => item.requestId === requestId.current);
            if (data?.caseId !== caseId || !Number.isSafeInteger(data.version) || data.version <= expectedVersion ||
                !stored?.file || stored.file.caseId !== caseId || !isPrivateFile(stored.file) || stored.fileStatus !== 'AVAILABLE' ||
                stored.previousVersion !== expectedVersion || (stored.reason || '') !== reason.trim()) throw new Error('Respuesta inválida');
            onSaved(data, stored.file);
        } catch (err) {
            if (err.response?.status === 409) setConflict(true);
            setError(await errorMessage(err, 'No se pudo confirmar el comprobante. Conservamos la selección; reintentá con los mismos datos.'));
        } finally { setProgress(null); onBusyChange(false); }
    };

    if (blockedReason) return <div className="border rounded-lg p-3 space-y-2">
        <p role="alert">{blockedReason}</p>
        <Button variant="legacy" size="legacy" type="button" disabled={busy} onClick={onClose}>Cerrar comprobante</Button>
    </div>;
    return <form onSubmit={submit} className="border rounded-lg p-3 grid gap-3">
        <h4 className="font-medium">{replacing ? 'Reemplazar comprobante de ' : 'Adjuntar comprobante a '}{label}</h4>
        <p>Archivo privado de hasta 20 MB. Adjuntar un comprobante no verifica el contenido del pago. Los archivos anteriores se conservan.</p>
        <Label>Comprobante para {label}<input type="file" accept={FORMATS} disabled={busy} onChange={choose} className="block w-full" /></Label>
        {file && <p>Archivo seleccionado: {file.name}</p>}
        <Label>Motivo del comprobante para {label}{replacing ? ' (obligatorio)' : ' (opcional)'}
            <Textarea required={replacing} maxLength={2000} disabled={busy} className="block w-full border rounded p-2" value={reason}
                onChange={event => { requestId.current = null; setReason(event.target.value); }} />
        </Label>
        {busy && <p role="status">{progress === 100 ? 'Archivo enviado. Confirmando guardado…' : progress === null ? 'Subiendo comprobante…' : 'Subiendo comprobante: ' + progress + '%'}</p>}
        {error && <p role="alert" className="text-status-red">{error}</p>}
        {conflict && <Button variant="legacy" size="legacy" type="button" disabled={busy} className="underline" onClick={onRefresh}>Descartar selección y actualizar honorarios</Button>}
        <Button variant="legacy" size="legacy" disabled={busy || !file} className="bg-indigo-600 text-white rounded p-2">{busy ? 'Guardando comprobante…' : 'Guardar comprobante'}</Button>
        <Button variant="legacy" size="legacy" type="button" disabled={busy} onClick={onClose}>Cancelar comprobante</Button>
    </form>;
}
