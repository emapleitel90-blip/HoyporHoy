import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
import { formatLegalDate } from '../utils/agendaDates';
import { Button } from './ui/button';
import { Card } from './ui/card';

const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('lyp_token')}` },
    timeout: 15000,
});

export function OverdueDeadlines() {
    const [overdue, setOverdue] = useState(null);
    const [loadError, setLoadError] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const [completing, setCompleting] = useState(null);
    const request = useRef(null);
    const mutation = useRef(null);

    const load = useCallback(async () => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setLoadError(false);
        try {
            const { data } = await axios.get(api.deadlines.myDay, { ...auth(), signal: controller.signal });
            if (controller.signal.aborted) return;
            if (!Array.isArray(data?.overdue)) throw new Error('Respuesta inválida');
            setOverdue(data.overdue);
        } catch {
            if (!controller.signal.aborted) setLoadError(true);
        }
    }, []);

    useEffect(() => {
        load();
        window.addEventListener('notifications-updated', load);
        window.addEventListener('focus', load);
        return () => {
            request.current?.abort();
            mutation.current?.abort();
            window.removeEventListener('notifications-updated', load);
            window.removeEventListener('focus', load);
        };
    }, [load]);

    async function complete(deadline) {
        if (mutation.current) return;
        const controller = new AbortController();
        mutation.current = controller;
        setCompleting(deadline.id);
        setSaveError('');
        setNotice('');
        try {
            const { data } = await axios.put(api.deadlines.update(deadline.id),
                { isCompleted: true, version: deadline.editVersion }, { ...auth(), signal: controller.signal });
            if (controller.signal.aborted) return;
            if (data?.id !== deadline.id || data.isCompleted !== true) throw new Error('Respuesta inválida');
            request.current?.abort();
            setOverdue(items => items?.filter(item => item.id !== deadline.id) ?? null);
            setNotice('Vencimiento marcado como cumplido.');
            notifyActivityChanged();
        } catch (error) {
            if (!controller.signal.aborted) {
                if (error.response?.status === 409 || error.response?.status === 404) {
                    setSaveError('El vencimiento cambió. Revisá la jornada actualizada antes de volver a marcarlo.');
                    await load();
                    return;
                }
                setSaveError('No se pudo confirmar el cambio. Actualizá la jornada antes de reintentar.');
            }
        } finally {
            if (mutation.current === controller) mutation.current = null;
            if (!controller.signal.aborted) setCompleting(null);
        }
    }

    return (
        <section aria-labelledby="overdue-heading">
            <Card className="mb-6 space-y-3 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 id="overdue-heading" className="text-lg font-bold">Vencimientos atrasados</h2>
                    {!!overdue?.length && !loadError && <span className="rounded-full bg-red-50 px-2.5 py-1 text-sm font-semibold text-status-red">{overdue.length}</span>}
                </div>
                {loadError && <div className="flex flex-wrap items-center gap-2">
                    <p role="alert" className="text-sm text-status-red">No se pudieron actualizar los vencimientos atrasados.</p>
                    <Button variant="outline" size="sm" onClick={load}>Reintentar vencimientos</Button>
                </div>}
                {saveError && <p role="alert" className="text-sm text-status-red">{saveError}</p>}
                {notice && <p role="status" className="text-sm text-status-green">{notice}</p>}
                {!loadError && overdue === null && <p role="status" className="text-sm text-muted-foreground">Cargando vencimientos atrasados…</p>}
                {!loadError && overdue?.length === 0 && <p className="text-sm text-muted-foreground">No hay vencimientos atrasados pendientes.</p>}
                {!!overdue?.length && <ul className="divide-y divide-border">
                    {overdue.map(deadline => (
                        <li key={deadline.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0 space-y-1">
                                <h3 className="break-words font-semibold">{deadline.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    Venció el <time dateTime={deadline.dueDate}>{formatLegalDate(deadline.dueDate)}</time>
                                    {' · '}{deadline.assignedLawyer || 'Sin responsable asignado'}
                                </p>
                                <Link to={`/cases/${deadline.caseId}`} className="break-words text-sm text-link underline">
                                    {[deadline.caseNumber, deadline.caseTitle].filter(Boolean).join(' · ') || 'Ver expediente'}
                                </Link>
                            </div>
                            <Button type="button" variant="outline" size="sm" disabled={completing !== null || loadError}
                                aria-label={`Marcar como cumplido: ${deadline.title}`} onClick={() => complete(deadline)}>
                                {completing === deadline.id ? 'Guardando…' : 'Marcar como cumplido'}
                            </Button>
                        </li>
                    ))}
                </ul>}
            </Card>
        </section>
    );
}
