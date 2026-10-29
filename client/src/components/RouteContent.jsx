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
                <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Volver a cargar</button>
            </div>;
        }
        return this.props.children;
    }
}

export default function RouteContent() {
    const { pathname } = useLocation();
    return <PageErrorBoundary key={pathname}>
        <Suspense fallback={<p role="status" className="p-6 text-gray-600">Cargando pantalla…</p>}>
            <Outlet />
        </Suspense>
    </PageErrorBoundary>;
}
