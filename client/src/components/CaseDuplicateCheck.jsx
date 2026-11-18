import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { checkCaseDuplicates, duplicateInput, hasDuplicateCriteria } from '../utils/caseDuplicates';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function CaseDuplicateCheck({ formData, caseId, getToken, review, onContinue, busy }) {
    const key = JSON.stringify(duplicateInput(formData, caseId));
    const [result, setResult] = useState(null);
    useEffect(() => {
        const input = JSON.parse(key);
        if (!hasDuplicateCriteria(input)) return;
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setResult({ key, status: 'checking' });
            try {
                const data = await checkCaseDuplicates(input, getToken(), controller.signal);
                if (!controller.signal.aborted) setResult({ key, ...data, status: 'ready' });
            } catch (error) { if (!controller.signal.aborted) setResult({ key, status: 'unavailable' }); }
        }, 450);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [key, getToken]);
    if (!hasDuplicateCriteria(JSON.parse(key))) return null;
    const current = review?.key === key ? review : result?.key === key ? result : null;
    if (!current || current.status === 'checking') return <p role="status" className="text-sm text-muted-foreground">Comprobando posibles coincidencias…</p>;
    if (current.status === 'ready' && !current.matches?.length) return <p className="text-xs text-muted-foreground">Sin coincidencias con los datos ingresados. La comprobación usa los expedientes a los que tenés acceso.</p>;
    return <Card className="border-amber-200 bg-amber-50 p-4 space-y-3" aria-label="Revisión de posibles duplicados">
        <h3 className="flex items-center gap-2 text-sm text-status-amber"><AlertTriangle className="h-4 w-4" />{current.status === 'unavailable' ? 'No se pudo verificar si hay duplicados' : 'Hay coincidencias para revisar'}</h3>
        <p className="text-sm text-secondary-foreground">{current.status === 'unavailable' ? 'Podés reintentar el guardado para verificar de nuevo o guardar sin esta comprobación.' : 'Pueden ser otros casos del mismo cliente. Revisá las coincidencias antes de crear o actualizar el expediente; no se fusiona ni se elimina información.'}</p>
        {current.matches?.map(item => <div key={item.id} className="rounded-md border border-border bg-card p-3 text-sm">
            <Link to={`/cases/${item.id}`} target="_blank" rel="noreferrer" className="text-link underline">{item.caseNumber} · {item.clientName || item.title}</Link>
            <p className="text-xs text-muted-foreground mt-1">{item.reasons.join(' · ')}</p>
        </div>)}
        {current.total > current.matches?.length && <p className="text-xs text-muted-foreground">Se muestran {current.matches.length} de {current.total} coincidencias.</p>}
        {review?.key === key && <Button variant="outline" type="button" disabled={busy} onClick={onContinue}>{current.status === 'unavailable' ? 'Guardar sin verificar coincidencias' : 'Revisé las coincidencias · guardar de todos modos'}</Button>}
    </Card>;
}
