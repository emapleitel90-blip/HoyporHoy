import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { FeePanel } from '../components/FeePanel';
import { api } from '../config/api';

const authState = vi.hoisted(() => ({ role: 'LAWYER' }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: authState.role } }) }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const agreement = { id: 'agreement', caseId: 'case-a', description: 'Acuerdo ficticio', totalCents: 10000, paidCents: 0, balanceCents: 10000,
    installments: [{ id: 'quota', position: 1, dueDate: '2026-10-28T03:00:00Z', amountCents: 10000, paidCents: 0, balanceCents: 10000, status: 'PENDING', payments: [] }] };
const partial = { ...agreement, paidCents: 4000, balanceCents: 6000,
    installments: [{ ...agreement.installments[0], paidCents: 4000, balanceCents: 6000, status: 'PARTIAL', payments: [{ id: 'pay', amountCents: 4000, paidAt: '2026-10-28T03:00:00Z' }] }] };
const reversed = requestId => ({ ...agreement,
    installments: [{ ...agreement.installments[0], payments: [{ ...partial.installments[0].payments[0],
        reversal: { id: 'reversal', paymentId: 'pay', requestId, reason: 'Importe registrado por error',
            registeredById: 'lawyer', registeredByName: 'Abogada revisora', createdAt: '2026-10-28T15:00:00Z' } }] }] });
let copy;
beforeEach(() => {
    vi.resetAllMocks(); authState.role = 'LAWYER';
    localStorage.setItem('lyp_token', 'token');
    copy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: copy } });
    axios.get.mockResolvedValue({ data: agreement });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); vi.unstubAllGlobals(); });

describe('Honorarios por expediente', () => {
    it('guarda el plan con sesión y conserva el formulario si falla', async () => {
        axios.get.mockResolvedValue({ data: null });
        axios.post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: agreement });
        const onChanged = vi.fn();
        const dispatch = vi.spyOn(window, 'dispatchEvent');
        render(<FeePanel caseId="case-a" onChanged={onChanged} />);
        await screen.findByRole('button', { name: 'Guardar acuerdo' });
        fireEvent.change(screen.getByLabelText('Descripción del acuerdo'), { target: { value: 'Acuerdo ficticio' } });
        fireEvent.change(screen.getByLabelText('Importe de cuota 1'), { target: { value: '100.00' } });
        fireEvent.change(screen.getByLabelText('Vencimiento de cuota 1'), { target: { value: '2026-10-28' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar acuerdo' }));
        await screen.findByRole('alert');
        expect(onChanged).not.toHaveBeenCalled();
        expect(dispatch).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Descripción del acuerdo').value).toBe('Acuerdo ficticio');
        fireEvent.click(screen.getByRole('button', { name: 'Guardar acuerdo' }));
        await screen.findByText('Acuerdo guardado.');
        expect(onChanged).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'notifications-updated' }));
        expect(axios.post).toHaveBeenLastCalledWith(api.fees.byCase('case-a'), { description: 'Acuerdo ficticio', installments: [{ amount: '100.00', dueDate: '2026-10-28' }] }, { headers: { Authorization: 'Bearer token' } });
    });

    it('reutiliza la solicitud al reintentar un pago y actualiza el recordatorio con el saldo', async () => {
        axios.post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: partial });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago de cuota 1' }));
        fireEvent.change(screen.getByLabelText('Importe del pago'), { target: { value: '40.00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }));
        await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }));
        await screen.findByText('Pago registrado. Saldo actualizado.');
        expect(axios.post.mock.calls[0][1].requestId).toBe(axios.post.mock.calls[1][1].requestId);
        expect(axios.post.mock.calls[0][1].requestId).toMatch(/^[0-9a-f-]{36}$/);
        fireEvent.click(screen.getByRole('button', { name: 'Copiar recordatorio de cuota 1' }));
        await waitFor(() => expect(copy).toHaveBeenCalled());
        expect(copy.mock.calls[0][0]).toContain('60,00');
        expect(copy.mock.calls[0][0]).not.toContain('100,00');
    });

    it('retira acciones de cobro al completar la cuota y conserva su historial', async () => {
        axios.post.mockResolvedValue({ data: { ...agreement, paidCents: 10000, balanceCents: 0,
            installments: [{ ...agreement.installments[0], paidCents: 10000, balanceCents: 0, status: 'PAID', payments: [{ id: 'payment', amountCents: 10000, paidAt: '2026-10-28T03:00:00Z', notes: 'Cancelación' }] }] } });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago de cuota 1' }));
        fireEvent.change(screen.getByLabelText('Importe del pago'), { target: { value: '100.00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }));
        await screen.findByText('Pago registrado. Saldo actualizado.');
        expect(screen.queryByRole('button', { name: 'Copiar recordatorio de cuota 1' })).toBeNull();
        expect(screen.getByText(/Cancelación/)).toBeTruthy();
    });

    it('recupera un fallo de carga y permite consulta sin registro al operador', async () => {
        authState.role = 'OPERATOR';
        axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: agreement });
        render(<FeePanel caseId="case-a" />);
        await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar honorarios' }));
        await screen.findByText('Acuerdo ficticio');
        expect(screen.queryByRole('button', { name: 'Registrar pago de cuota 1' })).toBeNull();
    });

    it('exige un motivo real antes de enviar una anulación', async () => {
        axios.get.mockResolvedValue({ data: partial });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Anular pago 1 de cuota 1' }));
        const reason = screen.getByLabelText('Motivo de anulación');
        expect(reason.required).toBe(true);
        expect(reason.maxLength).toBe(2000);
        fireEvent.change(reason, { target: { value: '   ' } });
        fireEvent.submit(reason.closest('form'));
        await screen.findByRole('alert');
        expect(axios.post).not.toHaveBeenCalled();
        expect(screen.queryByText('Pago anulado. Saldo y recordatorios actualizados.')).toBeNull();
    });

    it('permite cancelar sin anular ni modificar el pago', async () => {
        axios.get.mockResolvedValue({ data: partial });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Anular pago 1 de cuota 1' }));
        fireEvent.change(screen.getByLabelText('Motivo de anulación'), { target: { value: 'No confirmar' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar anulación' }));
        expect(screen.queryByLabelText('Motivo de anulación')).toBeNull();
        expect(screen.getByRole('button', { name: 'Anular pago 1 de cuota 1' })).toBeTruthy();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('reintenta la misma anulación, conserva el pago y actualiza saldo y recordatorio', async () => {
        axios.get.mockResolvedValue({ data: partial });
        axios.post.mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(async (_, body) => ({ data: reversed(body.requestId) }));
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Anular pago 1 de cuota 1' }));
        fireEvent.change(screen.getByLabelText('Motivo de anulación'), { target: { value: '  Importe registrado por error  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('Motivo de anulación').value).toBe('  Importe registrado por error  ');
        expect(screen.queryByText('Pago anulado. Saldo y recordatorios actualizados.')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
        await screen.findByText('Pago anulado. Saldo y recordatorios actualizados.');
        const [url, payload, options] = axios.post.mock.calls[0];
        expect(url).toBe(api.fees.reversePayment('pay'));
        expect(payload.reason).toBe('Importe registrado por error');
        expect(payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(axios.post.mock.calls[1][1].requestId).toBe(payload.requestId);
        expect(options.headers.Authorization).toBe('Bearer token');
        expect(screen.getByText(/Pago.*40,00/)).toBeTruthy();
        expect(screen.getByText(/Anulado.*Abogada revisora/)).toBeTruthy();
        expect(screen.getByText('Motivo: Importe registrado por error')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Anular pago 1 de cuota 1' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Copiar recordatorio de cuota 1' }));
        await waitFor(() => expect(copy).toHaveBeenCalled());
        expect(copy.mock.calls[0][0]).toContain('100,00');
        expect(copy.mock.calls[0][0]).not.toContain('60,00');
    });

    it('rechaza una respuesta sin la anulación confirmada y permite reintentar', async () => {
        axios.get.mockResolvedValue({ data: partial });
        axios.post.mockResolvedValue({ data: partial });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Anular pago 1 de cuota 1' }));
        fireEvent.change(screen.getByLabelText('Motivo de anulación'), { target: { value: 'Importe registrado por error' } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar anulación' }));
        await screen.findByRole('alert');
        expect(screen.queryByText('Pago anulado. Saldo y recordatorios actualizados.')).toBeNull();
        expect(screen.getByRole('button', { name: 'Confirmar anulación' }).disabled).toBe(false);
        expect(screen.getByLabelText('Motivo de anulación').value).toBe('Importe registrado por error');
    });

    it('muestra el historial de anulaciones al operador sin ofrecer acciones de registro', async () => {
        authState.role = 'OPERATOR';
        axios.get.mockResolvedValueOnce({ data: partial }).mockResolvedValueOnce({ data: reversed('previous-request') });
        render(<FeePanel caseId="case-a" />);
        await screen.findByText(/Pago.*40,00/);
        expect(screen.queryByRole('button', { name: /Anular pago/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar honorarios' }));
        await screen.findByText('Motivo: Importe registrado por error');
        expect(screen.getByText(/Anulado.*Abogada revisora/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Anular pago/ })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Registrar pago de cuota 1' })).toBeNull();
    });

    it('mantiene un solo formulario entre registrar y anular un pago', async () => {
        axios.get.mockResolvedValue({ data: partial });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Registrar pago de cuota 1' }));
        expect(screen.getByLabelText('Importe del pago')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Anular pago 1 de cuota 1' }));
        expect(screen.queryByLabelText('Importe del pago')).toBeNull();
        expect(screen.getByLabelText('Motivo de anulación')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Registrar pago de cuota 1' }));
        expect(screen.queryByLabelText('Motivo de anulación')).toBeNull();
        expect(screen.getByLabelText('Importe del pago')).toBeTruthy();
    });
});
