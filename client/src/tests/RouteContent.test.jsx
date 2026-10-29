import React, { lazy } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import RouteContent from '../components/RouteContent';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const open = Page => render(<MemoryRouter initialEntries={['/slow']}>
    <Routes>
        <Route element={<><nav><Link to="/other">Otra sección</Link></nav><Outlet /></>}>
            <Route element={<RouteContent />}>
                <Route path="/slow" element={<Page />} />
                <Route path="/other" element={<h1>Otra pantalla</h1>} />
            </Route>
        </Route>
    </Routes>
</MemoryRouter>);

describe('Carga de pantallas bajo demanda', () => {
    it('mantiene la navegación visible mientras descarga y muestra luego la pantalla', async () => {
        let resolve;
        const Page = lazy(() => new Promise(done => { resolve = done; }));
        open(Page);
        expect(screen.getByRole('status').textContent).toBe('Cargando pantalla…');
        expect(screen.getByRole('link', { name: 'Otra sección' })).toBeTruthy();
        await act(async () => resolve({ default: () => <h1>Pantalla cargada</h1> }));
        expect(screen.getByRole('heading', { name: 'Pantalla cargada' })).toBeTruthy();
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('permite salir de una pantalla que no termina de cargar', async () => {
        const Page = lazy(() => new Promise(() => {}));
        open(Page);
        fireEvent.click(screen.getByRole('link', { name: 'Otra sección' }));
        await screen.findByRole('heading', { name: 'Otra pantalla' });
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('ofrece recuperación ante una descarga fallida y no bloquea otras rutas', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const Page = lazy(() => Promise.reject(new Error('Download failed')));
        open(Page);
        await screen.findByRole('alert');
        expect(screen.getByRole('button', { name: 'Volver a cargar' })).toBeTruthy();
        fireEvent.click(screen.getByRole('link', { name: 'Otra sección' }));
        await screen.findByRole('heading', { name: 'Otra pantalla' });
        expect(screen.queryByRole('alert')).toBeNull();
    });
});
