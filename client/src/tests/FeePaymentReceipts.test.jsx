import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { FeePanel } from '../components/FeePanel';
import { api } from '../config/api';
import { downloadCaseFile } from '../utils/caseFiles';

const authState = vi.hoisted(() => ({ role: 'LAWYER' }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: authState.role } }) }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../utils/caseFiles', async importOriginal => ({ ...await importOriginal(), downloadCaseFile: vi.fn() }));
const label = 'pago 1 de cuota 1';
const agreement = { id: 'a', caseId: 'case-a', version: 2, description: 'Acuerdo de prueba', totalCents: 10025, paidCents: 4010, balanceCents: 6015,
    installments: [{ id: 'quota', position: 1, dueDate: '2026-10-28T03:00:00Z', amountCents: 10025, paidCents: 4010, balanceCents: 6015, status: 'PARTIAL',
        payments: [{ id: 'payment', amountCents: 4010, paidAt: '2026-10-28T03:00:00Z', receipts: [] }] }] };
const receipt = { id: 'receipt', paymentId: 'payment', sequence: 1, reason: '', previousVersion: 2, uploadedByName: 'Abogada ficticia',
    createdAt: '2026-10-28T15:00:00Z', fileStatus: 'AVAILABLE',
    file: { id: '11111111-1111-4111-8111-111111111111', caseId: 'case-a', name: 'comprobante.pdf', url: '/api/cases/files/11111111-1111-4111-8111-111111111111/download' } };
const withReceipts = (receipts, version = 3, reversal = null) => ({ ...agreement, version,
    installments: [{ ...agreement.installments[0], payments: [{ ...agreement.installments[0].payments[0], receipts, reversal }] }] });
const saved = payload => withReceipts([{ ...receipt, requestId: payload.get('requestId'), reason: payload.get('reason') }]);
const file = () => new File(['%PDF-1.4\nContenido ficticio\n%%EOF'], 'comprobante.pdf', { type: 'application/pdf' });
const choose = () => fireEvent.change(screen.getByLabelText('Comprobante para ' + label), { target: { files: [file()] } });
const open = async callback => {
    render(<FeePanel caseId="case-a" onReceiptSaved={callback} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Adjuntar comprobante a ' + label }));
};
beforeEach(() => {
    vi.resetAllMocks(); authState.role = 'LAWYER'; localStorage.setItem('lyp_token', 'token');
    axios.get.mockResolvedValue({ data: agreement });
    axios.post.mockImplementation(async (_, payload) => ({ data: saved(payload) }));
    downloadCaseFile.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Comprobantes privados de pagos de honorarios', () => {
    it('envía archivo real y versión en multipart y actualiza los archivos del expediente al confirmar', async () => {
        const callback = vi.fn(); await open(callback); choose();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' }));
        await screen.findByText('Comprobante guardado.');
        const [url, payload, options] = axios.post.mock.calls[0];
        expect(url).toBe(api.fees.receipt('payment'));
        expect(payload).toBeInstanceOf(FormData); expect(payload.get('file')).toBeInstanceOf(File);
        expect(payload.get('expectedVersion')).toBe('2'); expect(payload.get('requestId')).toMatch(/^[0-9a-f-]{36}$/);
        expect(options.headers).toEqual({ Authorization: 'Bearer token' });
        expect(callback).toHaveBeenCalledWith(receipt.file);
        expect(screen.getByRole('button', { name: 'Descargar comprobante 1 de ' + label })).toBeTruthy();
    });

    it('conserva selección, versión e identificador al reintentar después de un fallo', async () => {
        axios.post.mockRejectedValueOnce(new Error('offline'));
        await open(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' }));
        await screen.findByRole('alert'); expect(screen.getByText('Archivo seleccionado: comprobante.pdf')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' }));
        await screen.findByText('Comprobante guardado.');
        expect(axios.post.mock.calls[1][1].get('requestId')).toBe(axios.post.mock.calls[0][1].get('requestId'));
        expect(axios.post.mock.calls[1][1].get('expectedVersion')).toBe('2');
    });

    it('requiere motivo al reemplazar y conserva los comprobantes anteriores', async () => {
        axios.get.mockResolvedValue({ data: withReceipts([receipt]) });
        axios.post.mockImplementation(async (_, payload) => ({ data: withReceipts([
            { ...receipt, id: 'new', sequence: 2, previousVersion: 3, reason: payload.get('reason'), requestId: payload.get('requestId') }, receipt,
        ], 4) }));
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Reemplazar comprobante de ' + label })); choose();
        const reason = screen.getByLabelText('Motivo del comprobante para ' + label + ' (obligatorio)');
        expect(reason.required).toBe(true);
        fireEvent.change(reason, { target: { value: '  ' } }); fireEvent.submit(reason.closest('form'));
        await screen.findByRole('alert'); expect(axios.post).not.toHaveBeenCalled();
        fireEvent.change(reason, { target: { value: 'Copia más legible' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' })); await screen.findByText('Comprobante guardado.');
        expect(screen.getByText('Motivo del reemplazo: Copia más legible')).toBeTruthy();
        expect(screen.getByText('Comprobantes anteriores de ' + label)).toBeTruthy();
    });

    it('mantiene el archivo seleccionado ante una actualización y descarta un GET viejo después de guardar', async () => {
        let settle;
        axios.get.mockResolvedValueOnce({ data: agreement }).mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }));
        await open(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Actualizar honorarios' }));
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
        expect(screen.getByText('Archivo seleccionado: comprobante.pdf')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' })); await screen.findByText('Comprobante guardado.');
        await act(async () => settle({ data: agreement }));
        expect(screen.getByRole('button', { name: 'Descargar comprobante 1 de ' + label })).toBeTruthy();
        expect(screen.queryByText('Cargando honorarios…')).toBeNull();
    });

    it('conserva el borrador en un conflicto y exige descartar explícitamente para cargar la versión actual', async () => {
        axios.post.mockRejectedValue({ response: { status: 409, data: { message: 'El acuerdo cambió' } } });
        await open(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' })); await screen.findByRole('alert');
        expect(screen.getByText('Archivo seleccionado: comprobante.pdf')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Descartar selección y actualizar honorarios' }));
        await waitFor(() => expect(screen.queryByText('Archivo seleccionado: comprobante.pdf')).toBeNull());
        expect(screen.queryByText('Comprobante guardado.')).toBeNull();
    });

    it('no comunica éxito si la respuesta no confirma el archivo y distingue envío completo del guardado', async () => {
        let complete;
        axios.post.mockImplementation((_, payload, options) => { options.onUploadProgress({ loaded: 50, total: 50 }); return new Promise(resolve => { complete = resolve; }); });
        await open(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Guardar comprobante' }));
        await screen.findByText('Archivo enviado. Confirmando guardado…');
        expect(screen.queryByText('Comprobante guardado.')).toBeNull();
        await act(async () => complete({ data: agreement }));
        await screen.findByRole('alert'); expect(screen.getByText('Archivo seleccionado: comprobante.pdf')).toBeTruthy();
    });

    it('permite descargar al operador y conserva lectura de un pago anulado sin controles de subida', async () => {
        authState.role = 'OPERATOR';
        axios.get.mockResolvedValue({ data: withReceipts([receipt], 4, { reason: 'Error previo', createdAt: '2026-10-28T15:00:00Z', registeredByName: 'Abogada' }) });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Descargar comprobante 1 de ' + label }));
        await waitFor(() => expect(downloadCaseFile).toHaveBeenCalledWith(receipt.file));
        expect(screen.getByText('Pago anulado: se conservan los comprobantes como parte del historial.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Reemplazar comprobante/ })).toBeNull();
    });

    it('muestra archivos faltantes sin ofrecer descarga y permite cancelar sin subir', async () => {
        axios.get.mockResolvedValue({ data: withReceipts([{ ...receipt, fileStatus: 'MISSING' }]) });
        render(<FeePanel caseId="case-a" />);
        fireEvent.click(await screen.findByRole('button', { name: 'Reemplazar comprobante de ' + label })); choose();
        expect(screen.getByText('El archivo de este comprobante no está disponible.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Descargar comprobante/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar comprobante' }));
        expect(axios.post).not.toHaveBeenCalled();
        expect(screen.queryByText('Archivo seleccionado: comprobante.pdf')).toBeNull();
    });

    it('retira el formulario si una actualización informa que el pago abierto fue anulado', async () => {
        axios.get.mockResolvedValueOnce({ data: agreement }).mockResolvedValueOnce({ data: withReceipts([], 3,
            { reason: 'Carga anulada por otra persona', createdAt: '2026-10-28T15:00:00Z', registeredByName: 'Abogada' }) });
        await open(); choose();
        fireEvent.click(screen.getByRole('button', { name: 'Actualizar honorarios' }));
        await screen.findByText('El pago está anulado. Sus comprobantes se conservan para consulta.');
        expect(screen.queryByRole('button', { name: 'Guardar comprobante' })).toBeNull();
        expect(screen.queryByLabelText('Comprobante para ' + label)).toBeNull();
        expect(axios.post).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar comprobante' }));
        expect(screen.queryByRole('button', { name: 'Cerrar comprobante' })).toBeNull();
    });
});
