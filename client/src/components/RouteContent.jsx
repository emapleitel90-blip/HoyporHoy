import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import React, { Component, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

class PageErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return <div role="alert" className="p-6 space-y-3">
                <p>No se pudo abrir esta pantalla. Podés ir a otra sección o volver a cargarla.</p>
                <Button variant="legacy" size="legacy" onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Volver a cargar</Button>
            </div>;
        }
        return this.props.children;
    }
}

export default function RouteContent() {
    const { pathname } = useLocation();
    return <PageErrorBoundary key={pathname}>
        <Suspense fallback={<div role="status" className="space-y-6 p-6 text-secondary-foreground">
            <p>Cargando pantalla…</p>
            <div aria-hidden="true" className="space-y-4">
                <Skeleton className="h-8 w-2/5" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>}>
            <Outlet />
        </Suspense>
    </PageErrorBoundary>;
}
