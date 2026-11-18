import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

export function AgendaDialog({ title, children, onClose, busy = false }) {
    const ref = useRef(null);
    useEffect(() => {
        const previous = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        ref.current?.focus();
        return () => { document.body.style.overflow = overflow; previous?.focus(); };
    }, []);
    return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-3 sm:p-6">
        <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="agenda-dialog-title"
            className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-xl bg-card border border-border shadow-xl p-5 sm:p-7"
            onKeyDown={event => {
                if (event.key === 'Escape' && !busy) onClose();
                if (event.key !== 'Tab') return;
                const items = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')];
                const first = items[0], last = items.at(-1);
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
            }}>
            <div className="flex items-center justify-between gap-4 mb-5">
                <h2 id="agenda-dialog-title" className="text-xl text-foreground">{title}</h2>
                <Button variant="ghost" size="icon" type="button" aria-label="Cerrar formulario" disabled={busy} onClick={onClose}><X /></Button>
            </div>
            {children}
        </section>
    </div>;
}
