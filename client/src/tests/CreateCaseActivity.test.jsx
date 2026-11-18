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
it('advierte coincidencias antes de guardar y solo continúa cuando se revisan explícitamente', async () => {
    const request = vi.fn(async (url, options = {}) => {
        if (url.startsWith(api.cases.duplicates)) return { ok: true, json: async () => ({ matches: [{ id: 'existing', caseNumber: 'EXP-1', clientName: 'José Pérez', reasons: ['Coincide el DNI/CUIT'] }], total: 1 }) };
        if (options.method) return { ok: true, json: async () => ({ id: 'saved' }) };
        return { ok: true, json: async () => ({ sections: [{ id: 'datos-consultante', title: 'Consultante', enabled: true, type: 'standard', fields: [
            { name: 'clientName', label: 'Nombre del cliente', type: 'text' }, { name: 'dni', label: 'DNI', type: 'text' },
        ] }] }) };
    });
    vi.stubGlobal('fetch', request);
    render(<MemoryRouter><CreateCase /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Nombre del cliente'), { target: { value: 'José Pérez' } });
    fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: 'Reclamo laboral' } });
    fireEvent.change(screen.getByLabelText('DNI / CUIT / CUIL (opcional)'), { target: { value: '20.123.456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));
    await screen.findByRole('button', { name: 'Revisé las coincidencias · guardar de todos modos' });
    expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
    expect(screen.getByRole('link', { name: /EXP-1/ }).getAttribute('href')).toBe('/cases/existing');
    fireEvent.click(screen.getByRole('button', { name: 'Revisé las coincidencias · guardar de todos modos' }));
    await waitFor(() => expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true));
    expect(JSON.parse(request.mock.calls.find(([, options]) => options?.method === 'POST')[1].body).details.dni).toBe('20.123.456');
});
it('muestra las actuaciones al elegir Sí y conserva los datos al navegar y guardar', async () => {
    const request = vi.fn(async (url, options = {}) => {
        if (url.startsWith(api.cases.duplicates)) return { ok: true, json: async () => ({ matches: [], total: 0 }) };
        if (options.method) return { ok: true, json: async () => ({ id: 'case' }) };
        return { ok: true, json: async () => ({ sections: [
            { id: 'datos-consultante', title: 'Consultante', enabled: true, type: 'standard', fields: [] },
            { id: 'informacion-caso', title: 'Información del Caso', enabled: true, type: 'standard', fields: [] },
        ] }) };
    });
    vi.stubGlobal('fetch', request);
    render(<MemoryRouter><CreateCase /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombre del cliente'), { target: { value: 'Cliente ficticio' } });
    fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: 'Reclamo laboral' } });
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'URGENT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrevista completa' }));
    await screen.findByRole('heading', { name: /Consultante/ });
    expect(screen.getByLabelText('Prioridad').value).toBe('URGENT');
    const status = screen.getByLabelText('¿Se inició un proceso o se realizó una actuación?');
    expect(screen.queryByLabelText('Actuación realizada')).toBeNull();
    fireEvent.change(status, { target: { value: 'Sí' } });
    fireEvent.change(screen.getByLabelText('Actuación realizada'), { target: { value: 'Presentación de demanda' } });
    fireEvent.change(screen.getByLabelText('Fecha de la actuación'), { target: { value: '2026-11-06' } });
    fireEvent.change(status, { target: { value: 'No' } });
    expect(screen.queryByLabelText('Actuación realizada')).toBeNull();
    fireEvent.change(status, { target: { value: 'Sí' } });
    expect(screen.getByLabelText('Actuación realizada').value).toBe('Presentación de demanda');
    fireEvent.click(screen.getByRole('button', { name: 'Alta rápida' }));
    expect(screen.getByLabelText('Nombre del cliente').value).toBe('Cliente ficticio');
    expect(screen.getByLabelText('Asunto').value).toBe('Reclamo laboral');
    fireEvent.click(screen.getByRole('button', { name: 'Crear expediente' }));
    await waitFor(() => expect(request.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(true));
    const saved = JSON.parse(request.mock.calls.find(([, options]) => options?.method === 'POST')[1].body);
    expect(saved.priority).toBe('URGENT');
    expect(saved.details).toMatchObject({ procesoIniciado: 'Sí', actuacionProcesal: 'Presentación de demanda', fechaActuacionProcesal: '2026-11-06' });
});
it.each([false, true])('actualiza actividad solo después de confirmar el expediente (edición: %s)', async editing => {
    let saves = 0;
    const request = vi.fn(async (url, options = {}) => {
        if (url.startsWith(api.cases.duplicates)) return { ok: true, json: async () => ({ matches: [], total: 0 }) };
        if (options.method) {
            saves++;
            return { ok: saves > 1, json: async () => ({ id: 'case', message: 'No se pudo guardar el expediente' }) };
        }
        if (url === api.formConfig.get) return { ok: true, json: async () => ({ sections: [
            { id: 'datos-consultante', title: 'Consultante', enabled: true, type: 'standard', fields: [] }
        ] }) };
        return { ok: true, json: async () => ({ id: 'case', clientName: 'Cliente ficticio', studioId: null, priority: 'HIGH', details: '{"urgencia":"Baja"}', editVersion: 0 }) };
    });
    vi.stubGlobal('fetch', request);
    render(<MemoryRouter initialEntries={[editing ? '/cases/case/edit' : '/cases/new']}><Routes>
        <Route path="/cases/new" element={<CreateCase />} />
        <Route path="/cases/:id/edit" element={<CreateCase />} />
        <Route path="/cases" element={<p>Lista de expedientes de prueba</p>} />
        <Route path="/cases/:id" element={<p>Ficha de expediente de prueba</p>} />
    </Routes></MemoryRouter>);
    const buttonName = editing ? 'Guardar Cambios' : 'Crear expediente';
    if (!editing) {
        fireEvent.change(screen.getByLabelText('Nombre del cliente'), { target: { value: 'Cliente ficticio' } });
        fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: 'Reclamo laboral' } });
        fireEvent.click(screen.getByRole('button', { name: 'Agregar próxima acción' }));
        fireEvent.change(screen.getByLabelText('Qué hay que hacer'), { target: { value: 'Pedir recibos' } });
        fireEvent.change(screen.getByLabelText('Fecha de la próxima acción'), { target: { value: '2026-11-18' } });
    }
    if (editing) expect((await screen.findByLabelText('Prioridad')).value).toBe('HIGH');
    fireEvent.click(await screen.findByRole('button', { name: buttonName }));
    await screen.findByText('No se pudo guardar el expediente');
    expect(notifyActivityChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: buttonName }));
    await screen.findByText(editing ? 'Lista de expedientes de prueba' : 'Ficha de expediente de prueba');
    expect(notifyActivityChanged).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(request.mock.calls.filter(([, options]) => options?.method)).toHaveLength(2));
    expect(request.mock.calls.find(([, options]) => options?.method)[1].method).toBe(editing ? 'PUT' : 'POST');
    if (!editing) {
        const [first, second] = request.mock.calls.filter(([, options]) => options?.method === 'POST')
            .map(([, options]) => JSON.parse(options.body));
        expect(first.requestId).toBeTruthy();
        expect(second).toEqual(first);
        expect(second.nextAction).toEqual({ title: 'Pedir recibos', dueDate: '2026-11-18', assigneeId: 'owner' });
    }
});

it('conserva el borrador ante un conflicto y solo carga la versión guardada por decisión del usuario', async () => {
    const firstVersion = 0;
    const latestVersion = 1;
    const save = vi.fn();
    let reads = 0;
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
        if (url.startsWith(api.cases.duplicates)) return { ok: true, json: async () => ({ matches: [], total: 0 }) };
        if (url === api.formConfig.get) return { ok: true, json: async () => ({ sections: [] }) };
        if (options.method === 'PUT') {
            save(JSON.parse(options.body));
            if (reads === 1) return { ok: false, status: 409, json: async () => ({ message: 'El expediente cambió.' }) };
            return { ok: true };
        }
        reads++;
        return { ok: true, json: async () => ({ id: 'case', clientName: 'Cliente de prueba',
            title: reads === 1 ? 'Asunto original' : 'Asunto de otra persona', editVersion: reads === 1 ? firstVersion : latestVersion }) };
    }));
    render(<MemoryRouter initialEntries={['/cases/case/edit']}><Routes>
        <Route path="/cases/:id/edit" element={<CreateCase />} />
        <Route path="/cases" element={<p>Lista de expedientes de prueba</p>} />
    </Routes></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Asunto'), { target: { value: 'Mi borrador' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await screen.findByText('El expediente cambió.');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Mi borrador', version: firstVersion }));
    expect(screen.getByLabelText('Asunto').value).toBe('Mi borrador');
    expect(screen.getByRole('link', { name: 'Ver versión guardada' }).target).toBe('_blank');
    expect(screen.getByRole('button', { name: 'Guardar Cambios' }).disabled).toBe(true);
    expect(notifyActivityChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador y cargar versión guardada' }));
    expect((await screen.findByLabelText('Asunto')).value).toBe('Asunto de otra persona');
    fireEvent.change(screen.getByLabelText('Asunto'), { target: { value: 'Asunto revisado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await screen.findByText('Lista de expedientes de prueba');
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Asunto revisado', version: latestVersion }));
});
