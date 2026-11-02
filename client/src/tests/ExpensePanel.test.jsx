import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { notifyActivityChanged } from '../utils/activityEvents';
vi.mock('../utils/activityEvents', () => ({ notifyActivityChanged: vi.fn() }));
import { ExpensePanel } from '../components/ExpensePanel';
import { api } from '../config/api';

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));

const receipt = { id: '11111111-1111-4111-8111-111111111111', name: 'recibo.pdf', caseId: 'case-a',
    url: '/api/cases/files/11111111-1111-4111-8111-111111111111/download', createdAt: '2026-10-26T15:00:00Z' };
const expense = { id: 'expense-a', caseId: 'case-a', description: 'Tasa de justicia', amount: 123.45, type: 'TASA_JUSTICIA',
    status: 'PENDING', createdAt: '2026-10-26T15:00:00Z', updatedAt: '2026-10-26T15:00:00.000Z',
    receiptUrl: receipt.url, receiptStatus: 'AVAILABLE', receipt };
const file = () => new File(['%PDF-1.4\nRecibo\n%%EOF'], 'recibo.pdf', { type: 'application/pdf' });
const ready = () => screen.findByRole('button', { name: 'Añadir' });
const fill = (withFile = true) => {
    fireEvent.change(screen.getByLabelText('Descripción del gasto'), { target: { value: expense.description } });
    fireEvent.change(screen.getByLabelText('Monto del gasto'), { target: { value: '123.45' } });
    fireEvent.change(screen.getByLabelText('Tipo de gasto'), { target: { value: 'TASA_JUSTICIA' } });
    if (withFile) fireEvent.change(screen.getByLabelText('Comprobante del nuevo gasto'), { target: { files: [file()] } });
};

beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('lyp_token', 'test-token');
    axios.get.mockResolvedValue({ data: { expenses: [], total: 0 } });
    axios.post.mockResolvedValue({ data: expense });
});
afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('Comprobantes de gastos: carga real y estados de la pantalla', () => {
    it('envía los bytes en multipart, actualiza el gasto y comunica el archivo guardado al expediente', async () => {
        const saved = vi.fn();
        render(<ExpensePanel caseId="case-a" onReceiptSaved={saved} />);
        await ready(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Gasto guardado correctamente', 'success'));
        const [url, payload, options] = axios.post.mock.calls[0];
        expect(url).toBe(api.expenses.create('case-a'));
        expect(payload).toBeInstanceOf(FormData);
        expect(payload.get('file')).toBeInstanceOf(File);
        expect(payload.get('file').name).toBe('recibo.pdf');
        expect(payload.get('amount')).toBe('123.45');
        expect(payload.get('description')).toBe(expense.description);
        expect(payload.get('receiptUrl')).toBeNull();
        expect(options.headers).toEqual({ Authorization: 'Bearer test-token' });
        expect(saved).toHaveBeenCalledWith(receipt);
        expect(notifyActivityChanged).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: 'Descargar comprobante de Tasa de justicia' })).toBeTruthy();
        expect(screen.getByText(/Total:/).textContent).toContain('123,45');
        expect(screen.getByLabelText('Descripción del gasto').value).toBe('');
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('permite guardar sin comprobante y no inventa una URL', async () => {
        axios.post.mockResolvedValue({ data: { ...expense, receipt: null, receiptUrl: null, receiptStatus: 'NONE' } });
        render(<ExpensePanel caseId="case-a" />);
        await ready(); fill(false);
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
        await screen.findByText('Sin comprobante');
        expect(axios.post.mock.calls[0][1].get('file')).toBeNull();
        expect(screen.queryByRole('button', { name: /Descargar comprobante/ })).toBeNull();
    });

    it('si falla el guardado, conserva formulario y archivo y permite reintentar', async () => {
        axios.post.mockRejectedValueOnce({ response: { data: { message: 'No se pudo guardar' } } }).mockResolvedValueOnce({ data: expense });
        const saved = vi.fn();
        render(<ExpensePanel caseId="case-a" onReceiptSaved={saved} />);
        await ready(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('No se pudo guardar', 'error'));
        expect(notifyActivityChanged).not.toHaveBeenCalled();
        expect(screen.getByLabelText('Descripción del gasto').value).toBe(expense.description);
        expect(screen.getByText('recibo.pdf')).toBeTruthy();
        expect(saved).not.toHaveBeenCalled();
        expect(showToast).not.toHaveBeenCalledWith('Gasto guardado correctamente', 'success');
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
        await waitFor(() => expect(saved).toHaveBeenCalledWith(receipt));
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it('transferir el 100% no muestra éxito hasta que el servidor confirme el guardado', async () => {
        let finish;
        axios.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
        render(<ExpensePanel caseId="case-a" />);
        await ready(); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
        act(() => axios.post.mock.calls[0][2].onUploadProgress({ loaded: 100, total: 100 }));
        expect(screen.getByRole('button', { name: 'Guardando (100%)...' }).disabled).toBe(true);
        expect(showToast).not.toHaveBeenCalled();
        await act(async () => finish({ data: expense }));
        expect(showToast).toHaveBeenCalledWith('Gasto guardado correctamente', 'success');
    });

    it('un enlace anterior no se ofrece como descarga; permite adjuntar su archivo verdadero', async () => {
        axios.get.mockResolvedValue({ data: { expenses: [{ ...expense, receipt: null, receiptStatus: 'LEGACY', receiptUrl: 'https://storage.lyp.com/falso.pdf' }] } });
        const saved = vi.fn();
        render(<ExpensePanel caseId="case-a" onReceiptSaved={saved} />);
        await ready();
        expect(screen.getByText('Comprobante anterior sin archivo verificable')).toBeTruthy();
        expect(document.querySelector('a[href*="storage.lyp.com"]')).toBeNull();
        expect(screen.queryByRole('button', { name: /Descargar comprobante/ })).toBeNull();
        fireEvent.change(screen.getByLabelText('Cargar comprobante de Tasa de justicia'), { target: { files: [file()] } });
        await screen.findByRole('button', { name: 'Descargar comprobante de Tasa de justicia' });
        const [url, payload] = axios.post.mock.calls[0];
        expect(url).toBe(api.expenses.receipt(expense.id));
        expect(payload.get('file')).toBeInstanceOf(File);
        expect(payload.get('version')).toBe(expense.updatedAt);
        expect(saved).toHaveBeenCalledWith(receipt);
    });

    it('un archivo perdido se muestra como no disponible y un error de reposición no genera éxito ficticio', async () => {
        axios.get.mockResolvedValue({ data: { expenses: [{ ...expense, receiptStatus: 'MISSING' }] } });
        axios.post.mockRejectedValue({ response: { status: 500, data: { message: 'Almacenamiento no disponible' } } });
        render(<ExpensePanel caseId="case-a" />);
        await ready();
        expect(screen.getByText('Archivo no disponible')).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Cargar comprobante de Tasa de justicia'), { target: { files: [file()] } });
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('Almacenamiento no disponible', 'error'));
        expect(showToast).not.toHaveBeenCalledWith('Comprobante guardado correctamente', 'success');
        expect(screen.queryByRole('button', { name: /Descargar comprobante/ })).toBeNull();
    });

    it('descarga con token, conserva el nombre del archivo y libera el enlace temporal', async () => {
        const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
        axios.get.mockImplementation(async url => url === api.expenses.byCase('case-a')
            ? { data: { expenses: [expense] } } : { data: blob });
        class DownloadURL extends URL {
            static createObjectURL = vi.fn(() => 'blob:comprobante');
            static revokeObjectURL = vi.fn();
        }
        vi.stubGlobal('URL', DownloadURL);
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        render(<ExpensePanel caseId="case-a" />);
        await ready();
        fireEvent.click(screen.getByRole('button', { name: 'Descargar comprobante de Tasa de justicia' }));
        await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
        expect(axios.get).toHaveBeenCalledWith(api.cases.downloadFile(receipt.id), {
            headers: { Authorization: 'Bearer test-token' }, responseType: 'blob',
        });
        expect(click.mock.contexts[0].download).toBe('recibo.pdf');
        expect(DownloadURL.createObjectURL).toHaveBeenCalledWith(blob);
        await new Promise(resolve => setTimeout(resolve, 1100));
        expect(DownloadURL.revokeObjectURL).toHaveBeenCalledWith('blob:comprobante');
    });

    it('permite reintentar una carga de gastos fallida', async () => {
        axios.get.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({ data: { expenses: [expense] } });
        render(<ExpensePanel caseId="case-a" />);
        await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        await screen.findByRole('button', { name: 'Descargar comprobante de Tasa de justicia' });
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('no mezcla gastos de otro expediente cuando una respuesta anterior llega tarde', async () => {
        let finish;
        axios.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
            .mockResolvedValueOnce({ data: { expenses: [{ ...expense, id: 'expense-b', caseId: 'case-b', description: 'Gasto B' }] } });
        const view = render(<ExpensePanel caseId="case-a" />);
        view.rerender(<ExpensePanel caseId="case-b" />);
        await screen.findByText('Gasto B');
        await act(async () => finish({ data: { expenses: [expense] } }));
        expect(screen.getByText('Gasto B')).toBeTruthy();
        expect(screen.queryByText('Tasa de justicia')).toBeNull();
    });

    it('rechaza un comprobante demasiado grande antes de enviarlo', async () => {
        render(<ExpensePanel caseId="case-a" />);
        await ready(); fill(false);
        const large = file(); Object.defineProperty(large, 'size', { value: 20 * 1024 * 1024 + 1 });
        fireEvent.change(screen.getByLabelText('Comprobante del nuevo gasto'), { target: { files: [large] } });
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
        expect(showToast).toHaveBeenCalledWith('El comprobante supera el límite de 20 MB', 'error');
        expect(axios.post).not.toHaveBeenCalled();
    });
});
