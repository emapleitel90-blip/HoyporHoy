import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, useParams } from 'react-router-dom';
import App from '../App';
import { api } from '../config/api';

// Keep the actual router, auth, login, layout and case list; isolate unrelated page APIs.
vi.mock('../components/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../pages/Dashboard', () => ({ default: () => <h2>Inicio de prueba</h2> }));
vi.mock('../pages/MyDay', () => ({ default: () => <h2>Jornada de prueba</h2> }));
vi.mock('../pages/Settings', () => ({ default: () => <h2>Configuración de prueba</h2> }));
vi.mock('../pages/StudioList', () => ({ default: () => <h2>Estudios de prueba</h2> }));
vi.mock('../pages/Notifications', () => ({ default: () => <h2>Notificaciones de prueba</h2> }));
vi.mock('../pages/CreateCase', () => ({ default: function CreateCase() {
    const { id } = useParams();
    return <h2>{id ? `Editar expediente ${id}` : 'Nuevo expediente'}</h2>;
} }));
vi.mock('../pages/ViewCase', () => ({ default: function ViewCase() {
    const { id } = useParams();
    return <><h2>Expediente {id}</h2><Link to={`/cases/${id}/edit`}>Editar expediente</Link></>;
} }));

const user = { id: 'lawyer', name: 'Abogada', email: 'lawyer@test.invalid', role: 'LAWYER', studioId: 'studio-a' };
const session = (role = 'LAWYER') => {
    localStorage.setItem('lyp_user', JSON.stringify({ ...user, role }));
    localStorage.setItem('lyp_token', 'test-token');
};
const open = (path = '/') => {
    window.history.replaceState({}, '', path);
    render(<App />);
};

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => ({ ok: true, json: async () => [{
        id: 'case-123', title: 'Prueba de navegación', clientName: 'María Pérez', status: 'OPEN',
        fuero: 'Laboral', score: 50, createdAt: '2026-10-26T15:00:00Z',
    }] })));
});
afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
});

describe('Navegación con React Router actualizado', () => {
    it('inicia el menú móvil cerrado y lo cierra al elegir una sección', async () => {
        session();
        open('/dashboard');
        await screen.findByRole('heading', { name: 'Inicio de prueba' });
        const menu = screen.getByRole('button', { name: 'Abrir menú' });
        expect(menu.getAttribute('aria-expanded')).toBe('false');
        fireEvent.click(menu);
        expect(menu.getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(screen.getByRole('link', { name: 'Mi jornada' }));
        await screen.findByRole('heading', { name: 'Jornada de prueba' });
        expect(menu.getAttribute('aria-expanded')).toBe('false');
    });

    it('permite cerrar el menú por botón, fondo y Escape', async () => {
        session();
        open('/dashboard');
        await screen.findByRole('heading', { name: 'Inicio de prueba' });
        const menu = screen.getByRole('button', { name: 'Abrir menú' });
        for (const close of [
            () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú', exact: true })),
            () => fireEvent.click(screen.getByRole('button', { name: 'Cerrar navegación lateral' })),
            () => fireEvent.keyDown(screen.getByRole('link', { name: 'Mi jornada' }), { key: 'Escape' }),
        ]) {
            fireEvent.click(menu);
            expect(menu.getAttribute('aria-expanded')).toBe('true');
            close();
            expect(menu.getAttribute('aria-expanded')).toBe('false');
        }
    });

    it('redirige una ruta protegida al login cuando no hay sesión', async () => {
        open('/cases/case-123');
        await screen.findByRole('button', { name: 'Acceder al Sistema' });
        expect(window.location.pathname).toBe('/login');
        expect(screen.queryByRole('main')).toBeNull();
    });

    it('inicia sesión con el formulario real, conserva la sesión y permite cerrarla', async () => {
        fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ...user, _id: user.id, token: 'new-token' }) });
        open('/login');
        fireEvent.change(screen.getByPlaceholderText('nombre@estudio.com'), { target: { value: user.email } });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'test-password' } });
        fireEvent.click(screen.getByRole('button', { name: 'Acceder al Sistema' }));
        await screen.findByRole('heading', { name: 'Inicio de prueba' });
        expect(window.location.pathname).toBe('/dashboard');
        expect(fetch).toHaveBeenCalledWith(api.auth.login, expect.objectContaining({ method: 'POST' }));
        expect(localStorage.getItem('lyp_token')).toBe('new-token');
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar Sesión' }));
        await screen.findByRole('button', { name: 'Acceder al Sistema' });
        expect(window.location.pathname).toBe('/login');
        expect(localStorage.getItem('lyp_token')).toBeNull();
    });

    it('redirige la raíz al dashboard y conserva los enlaces del menú', async () => {
        session();
        open();
        await screen.findByRole('heading', { name: 'Inicio de prueba' });
        expect(window.location.pathname).toBe('/dashboard');
        fireEvent.click(screen.getByRole('link', { name: 'Mi jornada' }));
        await screen.findByRole('heading', { name: 'Jornada de prueba' });
        expect(window.location.pathname).toBe('/mi-jornada');
        fireEvent.click(screen.getByRole('link', { name: 'Configuración' }));
        await screen.findByRole('heading', { name: 'Configuración de prueba' });
        expect(window.location.pathname).toBe('/settings');
    });

    it('abre el detalle desde la lista real y conserva el id al pasar a edición', async () => {
        session();
        open('/cases');
        // The real list module is now downloaded before its data request starts.
        await screen.findByText('María Pérez', {}, { timeout: 5000 });
        fireEvent.click(screen.getByRole('link', { name: 'Ver' }));
        await screen.findByRole('heading', { name: 'Expediente case-123' });
        expect(window.location.pathname).toBe('/cases/case-123');
        fireEvent.click(screen.getByRole('link', { name: 'Editar expediente' }));
        await screen.findByRole('heading', { name: 'Editar expediente case-123' });
        expect(window.location.pathname).toBe('/cases/case-123/edit');
    });

    it('distingue la ruta de nuevo expediente de la ruta con id', async () => {
        session();
        open('/cases/new');
        await screen.findByRole('heading', { name: 'Nuevo expediente' });
        expect(window.location.pathname).toBe('/cases/new');
    });

    it.each(['LAWYER', 'SUPER_ADMIN'])('mantiene el menú de estudios correspondiente al rol %s', async role => {
        session(role);
        open('/dashboard');
        await screen.findByRole('heading', { name: 'Inicio de prueba' });
        const studios = screen.queryByRole('link', { name: 'SaaS Estudios' });
        if (role === 'LAWYER') expect(studios).toBeNull();
        else {
            fireEvent.click(studios);
            await waitFor(() => expect(window.location.pathname).toBe('/studios'));
            expect(screen.getByRole('heading', { name: 'Estudios de prueba' })).toBeTruthy();
        }
    });
});
