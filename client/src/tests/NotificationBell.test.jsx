import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { NotificationBell } from '../components/NotificationBell';
import { notifyActivityChanged } from '../utils/activityEvents';
vi.mock('axios', () => ({ default: { get: vi.fn() } }));
const state = vi.hoisted(() => ({ user: { id: 'first' } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => state }));
afterEach(() => { cleanup(); vi.resetAllMocks(); localStorage.clear(); state.user = { id: 'first' }; });
const bell = () => <MemoryRouter><NotificationBell /></MemoryRouter>;
it('conserva una actualización recibida durante la consulta y agrupa avisos simultáneos', async () => {
    localStorage.setItem('lyp_token', 'demo');
    let finish;
    axios.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
        .mockResolvedValueOnce({ data: { unread: 3 } });
    render(bell());
    act(() => { notifyActivityChanged(); notifyActivityChanged(); });
    expect(axios.get).toHaveBeenCalledTimes(1);
    await act(async () => finish({ data: { unread: 1 } }));
    await screen.findByRole('link', { name: 'Actividad y notificaciones: 3 sin leer' });
    expect(axios.get).toHaveBeenCalledTimes(2);
});
it('descarta la respuesta del usuario anterior y elimina la escucha al desmontar', async () => {
    localStorage.setItem('lyp_token', 'demo');
    let finish;
    axios.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
        .mockResolvedValueOnce({ data: { unread: 2 } });
    const { rerender, unmount } = render(bell());
    state.user = { id: 'second' }; rerender(bell());
    await screen.findByRole('link', { name: 'Actividad y notificaciones: 2 sin leer' });
    await act(async () => finish({ data: { unread: 99 } }));
    expect(screen.getByRole('link', { name: 'Actividad y notificaciones: 2 sin leer' })).toBeTruthy();
    unmount(); act(() => notifyActivityChanged());
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
});
