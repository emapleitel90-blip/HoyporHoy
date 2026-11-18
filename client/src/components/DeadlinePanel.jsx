import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { dayKey, formatLegalDate } from '../utils/agendaDates';
import { Clock, Plus, CheckCircle, Circle } from 'lucide-react';

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` }, timeout: 15000 });
const validDeadline = (item, caseId) => item && typeof item.id === 'string' && item.caseId === caseId &&
    typeof item.title === 'string' && typeof item.isCompleted === 'boolean' && typeof item.dueDate === 'string' && Number.isFinite(Date.parse(item.dueDate)) &&
    Number.isInteger(item.editVersion) && item.editVersion >= 0;
const prescriptionSource = 'ADMISSION_PRESCRIPTION';
export const DeadlinePanel = props => <Deadlines key={`${props.caseId}:${props.prescriptionDate || ''}`} {...props} />;
function Deadlines({ caseId, initialDate, onChanged, prescriptionDate, canConfirmPrescription }) {
    const [deadlines, setDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [newDate, setNewDate] = useState(initialDate || '');
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [reviewingPrescription, setReviewingPrescription] = useState(false);
    const [selectedDeadline, setSelectedDeadline] = useState('');
    const mutating = useRef(false);
    const active = useRef(true);
    const generation = useRef(0);
    const fetchDeadlines = useCallback(async () => {
        const current = ++generation.current;
        setLoading(true); setLoadError('');
        try {
            const { data } = await axios.get(api.deadlines.byCase(caseId), auth());
            if (!Array.isArray(data) || data.some(item => !validDeadline(item, caseId))) throw new Error('Respuesta inválida');
            if (active.current && current === generation.current) {
                setDeadlines(data);
                setReviewingPrescription(false);
                setSelectedDeadline('');
            }
        } catch (error) {
            if (active.current && current === generation.current) setLoadError(error.response?.data?.message || 'No se pudieron cargar los vencimientos. Reintentá con Actualizar vencimientos.');
        } finally {
            if (active.current && current === generation.current) setLoading(false);
        }
    }, [caseId]);
    useEffect(() => {
        const requests = generation;
        active.current = true; fetchDeadlines();
        return () => { active.current = false; ++requests.current; };
    }, [fetchDeadlines]);

    const linkedPrescription = deadlines.find(item => item.source === prescriptionSource);
    const formattedEstimate = /^\d{4}-\d{2}-\d{2}$/.test(prescriptionDate || '') && formatLegalDate(prescriptionDate);
    const sameDayDeadlines = reviewingPrescription
        ? deadlines.filter(item => !item.source && dayKey(item.dueDate) === prescriptionDate) : [];
    const duplicateCandidate = sameDayDeadlines.some(item => /prescripci[oó]n/i.test(item.title));
    const prescriptionConfirmed = !!linkedPrescription && linkedPrescription.sourceDate === prescriptionDate;
    const disabled = busy || loading || !!loadError;

    const save = async (deadline, confirmation) => {
        if (mutating.current || loading || loadError) return;
        const title = newTitle.trim();
        if (!deadline && !confirmation && (!title || title.length > 200 || !newDate)) {
            setSaveError('Ingresá una descripción de hasta 200 caracteres y una fecha.'); return;
        }
        mutating.current = true; setBusy(true); setSaveError(''); setNotice(''); ++generation.current;
        try {
            let response;
            if (confirmation) {
                response = await axios.post(api.deadlines.confirmPrescription(caseId), confirmation, auth());
            } else if (deadline) {
                response = await axios.put(api.deadlines.update(deadline.id), { isCompleted: !deadline.isCompleted, version: deadline.editVersion }, auth());
            } else {
                response = await axios.post(api.deadlines.create(caseId), { title, dueDate: newDate }, auth());
            }
            const { data } = response;
            if (!validDeadline(data, caseId) || (deadline && (data.id !== deadline.id || data.isCompleted !== !deadline.isCompleted)) ||
                (confirmation && (data.source !== prescriptionSource || data.sourceDate !== confirmation.date ||
                    dayKey(data.dueDate) !== confirmation.date || (confirmation.deadlineId && data.id !== confirmation.deadlineId))) ||
                (!deadline && !confirmation && (data.title !== title || data.isCompleted))) {
                throw new Error('Respuesta inválida');
            }
            notifyActivityChanged();
            onChanged?.();
            if (!active.current) return;
            setDeadlines(current => [...current.filter(item => item.id !== data.id), data].sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate)));
            if (confirmation) {
                setReviewingPrescription(false);
                setSelectedDeadline('');
                setNotice('Fecha de prescripción confirmada en la agenda.');
            } else if (deadline) {
                setNotice('Estado del vencimiento actualizado.');
            } else {
                setNewTitle(''); setNewDate('');
                setNotice('Vencimiento guardado.');
            }
        } catch (error) {
            if (active.current) {
                setSaveError(error.response?.data?.message || 'No se pudo confirmar el cambio. Los datos se conservan. Actualizá los vencimientos antes de reintentar para comprobar si se guardó.');
                if ([404, 409].includes(error.response?.status)) await fetchDeadlines();
            }
        } finally {
            mutating.current = false;
            if (active.current) setBusy(false);
        }
    };
    const handleAdd = event => { event.preventDefault(); save(null); };
    const toggleStatus = deadline => save(deadline);
    const closePrescriptionReview = () => { setReviewingPrescription(false); setSelectedDeadline(''); setSaveError(''); };
    const submitPrescription = () => {
        const target = linkedPrescription || sameDayDeadlines.find(item => item.id === selectedDeadline);
        if (selectedDeadline && !target) return;
        save(null, { date: prescriptionDate, ...(target ? { deadlineId: target.id, version: target.editVersion } : {}) });
    };

    return (
        <Card id="agenda-vencimientos" className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mt-6 scroll-mt-6">
            <div className="px-6 py-4 border-b border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-link" />
                    <h3 className="text-base font-semibold text-foreground">Agenda de Vencimientos</h3>
                </div>
            </div>
            <div className="p-6">
                <Button variant="legacy" size="legacy" type="button" disabled={busy || loading} onClick={fetchDeadlines} className="underline mb-3">Actualizar vencimientos</Button>
                {loadError && <p role="alert" className="text-status-red mb-3">{loadError}</p>}
                {saveError && <p role="alert" className="text-status-red mb-3">{saveError}</p>}
                {notice && <p role="status" className="text-status-green mb-3">{notice}</p>}
                {formattedEstimate && !prescriptionConfirmed && (
                    <section className="mb-4 space-y-3 rounded-lg border border-border bg-background p-4" aria-label="Confirmar fecha estimada de prescripción">
                        <h4 className="font-semibold text-sm">Prescripción estimada · {formattedEstimate}</h4>
                        <p className="text-sm text-muted-foreground">
                            {linkedPrescription
                                ? `El vencimiento vigente es el ${formatLegalDate(linkedPrescription.dueDate)}. La agenda conserva esa fecha hasta que confirmes el cambio.`
                                : 'La estimación requiere revisión profesional antes de incorporarla como vencimiento.'}
                        </p>
                        {linkedPrescription?.isCompleted && <p className="text-sm">Reabrí el vencimiento cumplido para confirmar la nueva fecha.</p>}
                        {canConfirmPrescription && !reviewingPrescription && (
                            <Button type="button" variant="outline" disabled={disabled || linkedPrescription?.isCompleted}
                                onClick={() => { setReviewingPrescription(true); setNotice(''); setSaveError(''); }}>Revisar fecha de prescripción</Button>
                        )}
                        {reviewingPrescription && (
                            <div className="space-y-3">
                                <p className="text-sm">Confirmá que revisaste la fecha {formattedEstimate} para este expediente.</p>
                                {linkedPrescription && duplicateCandidate && <p className="text-sm text-status-red">Ya hay otro vencimiento de prescripción en la nueva fecha. Revisá ambos en la agenda antes de confirmar el cambio.</p>}
                                {!linkedPrescription && sameDayDeadlines.length > 0 && <div className="space-y-2">
                                    <Label htmlFor="prescription-existing-deadline">Vencimiento de agenda</Label>
                                    <NativeSelect id="prescription-existing-deadline" className="w-full" disabled={disabled}
                                        value={selectedDeadline} onChange={event => setSelectedDeadline(event.target.value)}>
                                        <option value="">{duplicateCandidate ? 'Elegí el vencimiento existente' : 'Crear un vencimiento de prescripción'}</option>
                                        {sameDayDeadlines.map(item => <option key={item.id} value={item.id}>
                                            {item.title}{item.isCompleted ? ' (cumplido)' : ''}
                                        </option>)}
                                    </NativeSelect>
                                </div>}
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" disabled={disabled || linkedPrescription?.isCompleted || (duplicateCandidate && (!!linkedPrescription || !selectedDeadline))}
                                        onClick={submitPrescription}>{linkedPrescription ? 'Confirmar nueva fecha' : selectedDeadline ? 'Confirmar y vincular' : 'Confirmar y agendar'}</Button>
                                    <Button type="button" variant="ghost" disabled={busy} onClick={closePrescriptionReview}>Cancelar confirmación</Button>
                                </div>
                            </div>
                        )}
                    </section>
                )}
                <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
                    <Input
                        type="text"
                        placeholder="Descripción del plazo..."
                        aria-label="Descripción del vencimiento" maxLength={200} disabled={busy || loading || !!loadError}
                        className="flex-1 border-border rounded-lg text-sm"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                    />
                    <Input
                        type="date"
                        aria-label="Fecha del vencimiento" disabled={busy || loading || !!loadError}
                        className="border-border rounded-lg text-sm"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        required
                    />
                    <Button variant="legacy" size="legacy" disabled={busy || loading || !!loadError} type="submit" className="bg-primary text-white p-2 text-sm rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1">
                        <Plus className="w-4 h-4"/> Añadir
                    </Button>
                </form>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {loading ? <p role="status">Cargando plazos...</p> : loadError ? null : deadlines.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No hay plazos registrados.</p>
                    ) : (
                        deadlines.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <Button variant="legacy" size="legacy" type="button" disabled={busy || loading} aria-label={`${d.isCompleted ? 'Reabrir' : 'Completar'} vencimiento: ${d.title}`} onClick={() => toggleStatus(d)} className="text-muted-foreground hover:text-link transition-colors cursor-pointer">
                                        {d.isCompleted ? <CheckCircle className="w-5 h-5 text-status-green" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                                    </Button>
                                    <div>
                                        <p className={`text-sm font-medium ${d.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                            {d.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Vence: {formatLegalDate(d.dueDate)}
                                        </p>
                                        {d.source === prescriptionSource && <p className="text-xs text-muted-foreground">Origen: fecha de prescripción confirmada del expediente</p>}
                                        {d.notes && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{d.notes}</p>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Card>
    );
}
