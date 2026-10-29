import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import Settings from '../pages/Settings';
import { api } from '../config/api';

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('axios', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));

const config = () => ({ sections: [
    { id: 'documents', title: 'Documentación', description: 'Documentos del cliente', enabled: true, type: 'checklist', items: ['DNI'] },
    { id: 'data', title: 'Datos básicos', description: 'Datos del cliente', enabled: true, type: 'standard', fields: [{ label: 'Nombre', type: 'text' }] },
] });
const loaded = () => screen.findByRole('button', { name: 'Guardar Cambios' });

beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('lyp_token', 'test-token');
    axios.get.mockResolvedValue({ data: config() });
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('Configuración: errores y recuperación', () => {
    it('muestra el error de carga y permite reintentar sin perder la sesión', async () => {
        axios.get.mockRejectedValueOnce(new Error('API sin conexión'));
        render(<Settings />);
        expect((await screen.findByRole('alert')).textContent).toContain('No se pudo cargar');
        expect(screen.queryByRole('button', { name: 'Guardar Cambios' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        await loaded();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByDisplayValue('Documentos del cliente')).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith(api.formConfig.base,
            expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
    });

    it.each([
        null, {}, { sections: null }, { sections: [null] },
        { sections: [{ ...config().sections[0], items: {} }] },
        { sections: [{ ...config().sections[1], fields: [null] }] },
        { sections: [config().sections[0], config().sections[0]] },
    ])('una respuesta inválida muestra recuperación en vez de romper la pantalla: %j', async data => {
        axios.get.mockResolvedValueOnce({ data });
        render(<Settings />);
        await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        await loaded();
        expect(screen.getByDisplayValue('Documentos del cliente')).toBeTruthy();
    });

    it('conserva los cambios si falla el guardado y permite guardarlos después', async () => {
        axios.put.mockRejectedValueOnce(new Error('Error al guardar')).mockResolvedValueOnce({});
        render(<Settings />);
        await loaded();
        fireEvent.change(screen.getByDisplayValue('Documentos del cliente'), { target: { value: 'Descripción editada' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Error al guardar', 'error'));
        expect(screen.getByDisplayValue('Descripción editada')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Guardar Cambios' }).disabled).toBe(false);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuración guardada con éxito', 'success'));
        expect(axios.put).toHaveBeenLastCalledWith(api.formConfig.base,
            { sections: [expect.objectContaining({ description: 'Descripción editada' }), config().sections[1]] },
            { headers: { Authorization: 'Bearer test-token' } });
    });

    it('restablecer selecciona un módulo disponible aunque el anterior ya no exista', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        axios.post.mockResolvedValue({ data: { sections: [{ ...config().sections[0], id: 'new-section', description: 'Valores por defecto' }] } });
        render(<Settings />);
        await loaded();
        fireEvent.click(screen.getByRole('button', { name: 'Datos básicos' }));
        expect(screen.getByDisplayValue('Datos del cliente')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
        expect(await screen.findByDisplayValue('Valores por defecto')).toBeTruthy();
        expect(showToast).toHaveBeenCalledWith('Configuración reseteada', 'success');
    });

    it.each(['network', 'invalid-response'])('si falla restablecer (%s), conserva la configuración y avisa el error', async failure => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        if (failure === 'network') axios.post.mockRejectedValue(new Error('API sin conexión'));
        else axios.post.mockResolvedValue({ data: { sections: null } });
        render(<Settings />);
        await loaded();
        fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Error al resetear', 'error'));
        expect(showToast).not.toHaveBeenCalledWith('Configuración reseteada', 'success');
        expect(screen.getByDisplayValue('Documentos del cliente')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Guardar Cambios' }).disabled).toBe(false);
    });

    it('una configuración sin módulos muestra un estado vacío y permite restablecerla', async () => {
        axios.get.mockResolvedValue({ data: { sections: [] } });
        render(<Settings />);
        await loaded();
        expect(screen.getByRole('status').textContent).toContain('No hay módulos configurados');
        expect(screen.getByRole('button', { name: 'Restablecer' }).disabled).toBe(false);
    });

    it('aborta la carga al salir y no reemplaza la configuración de una nueva pantalla', async () => {
        let resolve;
        axios.get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
        const first = render(<Settings />);
        const signal = axios.get.mock.calls[0][1].signal;
        first.unmount();
        expect(signal.aborted).toBe(true);
        render(<Settings />);
        await loaded();
        resolve({ data: { sections: [] } });
        await waitFor(() => expect(screen.getByDisplayValue('Documentos del cliente')).toBeTruthy());
    });
});
