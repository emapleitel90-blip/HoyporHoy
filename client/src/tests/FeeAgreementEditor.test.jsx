import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { FeePanel } from '../components/FeePanel';
import { api } from '../config/api';

const authState = vi.hoisted(() => ({ role: 'LAWYER' }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: authState.role } }) }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const original = { id: 'agreement', caseId: 'case-a', version: 3, amendments: [], description: 'Acuerdo anterior', currency: 'ARS',
    totalCents: 10000, paidCents: 4000, balanceCents: 6000,
    installments: [{ id: 'quota', position: 1, dueDate: '2026-10-28T03:00:00Z', amountCents: 10000, paidCents: 4000, balanceCents: 6000,
        status: 'PARTIAL', payments: [{ id: 'payment', amountCents: 4000, paidAt: '2026-10-28T03:00:00Z', notes: 'Pago original' }] }] };
const snapshot = agreement => ({ description: agreement.description, currency: agreement.currency,
    installments: agreement.installments.map(({ id, position, dueDate, amountCents, paidCents }) => ({ id, position, dueDate, amountCents, paidCents })) });
const modified = payload => {
    const installments = payload.installments.map((item, index) => ({
        ...(original.installments[index] || { id: 'new-quota', payments: [], paidCents: 0 }),
        position: index + 1, amountCents: Math.round(Number(item.amount) * 100), dueDate: item.dueDate + 'T03:00:00Z',
        balanceCents: Math.round(Number(item.amount) * 100) - (original.installments[index]?.paidCents || 0), status: 'PARTIAL',
    }));
    const after = { ...original, description: payload.description, version: payload.expectedVersion + 1,
        totalCents: installments.reduce((sum, item) => sum + item.amountCents, 0),
        balanceCents: installments.reduce((sum, item) => sum + item.balanceCents, 0), installments };
    return { ...after, amendments: [{ id: 'change', requestId: payload.requestId, reason: payload.reason,
        previousVersion: payload.expectedVersion, version: after.version, registeredByName: 'Abogada revisora',
        registeredById: 'lawyer', createdAt: '2026-10-28T15:00:00Z', before: snapshot(original), after: snapshot(after) }] };
};
let copy;
const open = async () => {
    render(<FeePanel caseId="case-a" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Modificar acuerdo' }));
};
const fill = () => {
    fireEvent.change(screen.getByLabelText('Descripción actualizada del acuerdo'), { target: { value: 'Acuerdo actualizado' } });
    fireEvent.change(screen.getByLabelText('Nuevo importe de cuota 1'), { target: { value: '120.25' } });
    fireEvent.change(screen.getByLabelText('Nuevo vencimiento de cuota 1'), { target: { value: '2026-11-05' } });
    fireEvent.change(screen.getByLabelText('Motivo del cambio'), { target: { value: '  Nueva fecha e importe pactados  ' } });
};
beforeEach(() => {
    vi.resetAllMocks(); authState.role = 'LAWYER';
    localStorage.setItem('lyp_token', 'token');
    copy = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
    axios.get.mockResolvedValue({ data: original });
    axios.post.mockImplementation(async (_, payload) => ({ data: modified(payload) }));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

describe('Modificación del acuerdo con versión e historial', () => {
    it('envía IDs, versión, cuotas nuevas y sesión; actualiza saldo y conserva antes/después', async () => {
        await open(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Agregar cuota al acuerdo' }));
        fireEvent.change(screen.getByLabelText('Nuevo importe de cuota 2'), { target: { value: '10.00' } });
        fireEvent.change(screen.getByLabelText('Nuevo vencimiento de cuota 2'), { target: { value: '2026-12-05' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await screen.findByText('Acuerdo modificado. Saldo y recordatorios actualizados.');
        const [url, payload, options] = axios.post.mock.calls[0];
        expect(url).toBe(api.fees.amend('case-a'));
        expect(payload).toMatchObject({ expectedVersion: 3, description: 'Acuerdo actualizado', reason: 'Nueva fecha e importe pactados',
            installments: [{ id: 'quota', amount: '120.25', dueDate: '2026-11-05' }, { amount: '10.00', dueDate: '2026-12-05' }] });
        expect(payload.installments[1]).not.toHaveProperty('id');
        expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(options.headers.Authorization).toBe('Bearer token');
        expect(screen.getByText('Versión 3 → 4')).toBeTruthy();
        expect(screen.getByText(/Abogada revisora/)).toBeTruthy();
        expect(screen.getByText('Descripción: Acuerdo anterior')).toBeTruthy();
        expect(screen.getByText('Descripción: Acuerdo actualizado')).toBeTruthy();
        expect(screen.getByText(/Pago original/)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Copiar recordatorio de cuota 1' }));
        await waitFor(() => expect(copy).toHaveBeenCalled());
        expect(copy.mock.calls[0][0]).toContain('80,25');
    });

    it('conserva datos y UUID después de un fallo de red y permite reintentar', async () => {
        axios.post.mockRejectedValueOnce(new Error('offline'));
        await open(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('Nuevo importe de cuota 1').value).toBe('120.25');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await screen.findByText('Acuerdo modificado. Saldo y recordatorios actualizados.');
        expect(axios.post.mock.calls[1][1].requestId).toBe(axios.post.mock.calls[0][1].requestId);
    });

    it('conserva la versión y edición ante 409 o una actualización del padre, hasta descartar explícitamente', async () => {
        axios.post.mockRejectedValue({ response: { status: 409 } });
        axios.get.mockResolvedValueOnce({ data: original }).mockResolvedValue({ data: { ...original, description: 'Cambio de otra persona', version: 4 } });
        await open(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('Descripción actualizada del acuerdo').value).toBe('Acuerdo actualizado');
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar honorarios' }));
        await screen.findByText('Cambio de otra persona');
        expect(screen.getByLabelText('Descripción actualizada del acuerdo').value).toBe('Acuerdo actualizado');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
        expect(axios.post.mock.calls[1][1].expectedVersion).toBe(3);
        fireEvent.click(screen.getByRole('button', { name: 'Descartar edición y actualizar acuerdo' }));
        await waitFor(() => expect(screen.queryByLabelText('Motivo del cambio')).toBeNull());
        fireEvent.click(await screen.findByRole('button', { name: 'Modificar acuerdo' }));
        expect(screen.getByLabelText('Descripción actualizada del acuerdo').value).toBe('Cambio de otra persona');
    });

    it('exige motivo e impide importes menores a lo abonado; cancelar no modifica datos', async () => {
        await open();
        const reason = screen.getByLabelText('Motivo del cambio');
        expect(reason.required).toBe(true); expect(reason.maxLength).toBe(2000);
        fireEvent.change(reason, { target: { value: '   ' } });
        fireEvent.submit(reason.closest('form'));
        await screen.findByRole('alert');
        expect(axios.post).not.toHaveBeenCalled();
        fireEvent.change(reason, { target: { value: 'Rectificación' } });
        fireEvent.change(screen.getByLabelText('Nuevo importe de cuota 1'), { target: { value: '39.99' } });
        fireEvent.submit(reason.closest('form'));
        expect(axios.post).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar edición del acuerdo' }));
        expect(screen.queryByLabelText('Motivo del cambio')).toBeNull();
        expect(screen.getByText('Acuerdo anterior')).toBeTruthy();
    });

    it.each(['respuesta', 'error'])('descarta un GET anterior con %s después de guardar el acuerdo', async mode => {
        let settle;
        axios.get.mockResolvedValueOnce({ data: original }).mockImplementationOnce(() => new Promise((resolve, reject) => {
            settle = () => mode === 'respuesta' ? resolve({ data: original }) : reject(new Error('old request failed'));
        }));
        await open(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar honorarios' }));
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await screen.findByText('Acuerdo modificado. Saldo y recordatorios actualizados.');
        await act(async () => settle());
        expect(screen.getByText('Versión 3 → 4')).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.queryByText('Cargando honorarios…')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Copiar recordatorio de cuota 1' }));
        await waitFor(() => expect(copy).toHaveBeenCalled());
        expect(copy.mock.calls[0][0]).toContain('80,25');
    });

    it('no comunica éxito con una respuesta sin el cambio confirmado', async () => {
        axios.post.mockResolvedValue({ data: original });
        await open(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios del acuerdo' }));
        await screen.findByRole('alert');
        expect(screen.queryByText('Acuerdo modificado. Saldo y recordatorios actualizados.')).toBeNull();
        expect(screen.getByLabelText('Nuevo importe de cuota 1').value).toBe('120.25');
    });

    it('mantiene un único formulario entre edición, pago y anulación', async () => {
        await open();
        fireEvent.click(screen.getByRole('button', { name: 'Registrar pago de cuota 1' }));
        expect(screen.queryByLabelText('Motivo del cambio')).toBeNull();
        expect(screen.getByLabelText('Importe del pago')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Modificar acuerdo' }));
        expect(screen.queryByLabelText('Importe del pago')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Anular pago 1 de cuota 1' }));
        expect(screen.queryByLabelText('Motivo del cambio')).toBeNull();
        expect(screen.getByLabelText('Motivo de anulación')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Modificar acuerdo' }));
        expect(screen.queryByLabelText('Motivo de anulación')).toBeNull();
        expect(screen.getByLabelText('Motivo del cambio')).toBeTruthy();
    });

    it('muestra el historial al operador sin ofrecer modificación', async () => {
        authState.role = 'OPERATOR';
        axios.get.mockResolvedValue({ data: modified({ expectedVersion: 3, description: 'Acuerdo actualizado', reason: 'Actualización pactada',
            requestId: 'request', installments: [{ id: 'quota', amount: '120.25', dueDate: '2026-11-05' }] }) });
        render(<FeePanel caseId="case-a" />);
        await screen.findByText('Historial de cambios del acuerdo');
        expect(screen.queryByRole('button', { name: 'Modificar acuerdo' })).toBeNull();
        expect(screen.getByText('Motivo del cambio: Actualización pactada')).toBeTruthy();
    });
});
