import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CreateCase from '../pages/CreateCase';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
vi.mock('../utils/activityEvents', () => ({ notifyActivityChanged: vi.fn() }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../context/AuthContext', () => {
    const user = { id: 'owner', role: 'LAWYER', name: 'Abogada' };
    const getToken = () => 'demo-session';
    return { useAuth: () => ({ user, getToken }) };
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.unstubAllGlobals(); });
it.each([false, true])('actualiza actividad solo después de confirmar el expediente (edición: %s)', async editing => {
    let saves = 0;
    const request = vi.fn(async (url, options = {}) => {
        if (options.method) {
            saves++;
            return { ok: saves > 1, json: async () => ({ message: 'No se pudo guardar el expediente' }) };
        }
        if (url === api.formConfig.get) return { ok: true, json: async () => ({ sections: [
            { id: 'datos-consultante', title: 'Consultante', enabled: true, type: 'standard', fields: [] }
        ] }) };
        return { ok: true, json: async () => ({ id: 'case', clientName: 'Cliente ficticio', studioId: null }) };
    });
    vi.stubGlobal('fetch', request);
    render(<MemoryRouter initialEntries={[editing ? '/cases/case/edit' : '/cases/new']}><Routes>
        <Route path="/cases/new" element={<CreateCase />} />
        <Route path="/cases/:id/edit" element={<CreateCase />} />
        <Route path="/cases" element={<p>Lista de expedientes de prueba</p>} />
    </Routes></MemoryRouter>);
    const buttonName = editing ? 'Guardar Cambios' : 'Finalizar Admisión';
    fireEvent.click(await screen.findByRole('button', { name: buttonName }));
    await screen.findByText('No se pudo guardar el expediente');
    expect(notifyActivityChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    await screen.findByText('Lista de expedientes de prueba');
    expect(notifyActivityChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(request.mock.calls.filter(([, options]) => options?.method)).toHaveLength(2));
    expect(request.mock.calls.find(([, options]) => options?.method)[1].method).toBe(editing ? 'PUT' : 'POST');
});
