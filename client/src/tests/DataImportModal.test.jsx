import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import axios from 'axios';
import { DataImportModal } from '../components/DataImportModal';
import { api } from '../config/api';

const { showToast } = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));

const rows = [
    ['Título', 'Cliente', 'Descripción', 'Fuero', 'Estado'],
    ['Caso laboral', 'María Pérez', 'Despido sin causa', 'Laboral', 'OPEN'],
    ['Caso civil', 'José Díaz', 'Daños', 'Civil', 'PENDING'],
];
const expectedCases = [
    { title: 'Caso laboral', clientName: 'María Pérez', description: 'Despido sin causa', fuero: 'Laboral', status: 'OPEN' },
    { title: 'Caso civil', clientName: 'José Díaz', description: 'Daños', fuero: 'Civil', status: 'PENDING' },
];
const makeFile = extension => {
    if (extension === 'csv') return new File(['\uFEFF' + Papa.unparse(rows)], 'casos.csv', { type: 'text/csv' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Casos');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: extension === 'xls' ? 'biff8' : 'xlsx' });
    return new File([bytes], `casos.${extension}`);
};
const choose = file => fireEvent.change(screen.getByLabelText('Archivo para importar'), { target: { files: [file] } });
const open = () => {
    const onClose = vi.fn();
    const onImportSuccess = vi.fn();
    render(<DataImportModal isOpen onClose={onClose} onImportSuccess={onImportSuccess} />);
    return { onClose, onImportSuccess };
};

beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('lyp_token', 'test-token');
    axios.post.mockResolvedValue({ data: { message: '2 casos importados exitosamente' } });
});
afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('Importación con lectores reales de CSV y Excel', () => {
    it.each(['csv', 'xlsx', 'xls'])('previsualiza e importa %s conservando tildes, columnas y sesión', async extension => {
        const callbacks = open();
        choose(makeFile(extension));
        await screen.findByText('2 filas detectadas');
        expect(screen.getByText('María Pérez')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Importar' }));
        await waitFor(() => expect(axios.post).toHaveBeenCalledWith(api.cases.import,
            { cases: expectedCases }, { headers: { Authorization: 'Bearer test-token' } }));
        expect(callbacks.onImportSuccess).toHaveBeenCalledTimes(1);
        expect(callbacks.onClose).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith('2 casos importados exitosamente', 'success');
    });

    it('permite importar mediante arrastrar y soltar', async () => {
        open();
        const target = screen.getByText('Haz clic o arrastra tu archivo aquí');
        fireEvent.drop(target, { dataTransfer: { files: [makeFile('xlsx')] } });
        await screen.findByText('2 filas detectadas');
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Importar' }));
        await waitFor(() => expect(axios.post).toHaveBeenCalledWith(api.cases.import,
            { cases: expectedCases }, expect.any(Object)));
    });

    it('conserva la vista previa cuando falla la API y permite reintentar', async () => {
        axios.post.mockRejectedValueOnce({ response: { data: { message: 'No se pudo importar' } } })
            .mockResolvedValueOnce({ data: { message: 'Importado' } });
        const callbacks = open();
        choose(makeFile('csv'));
        await screen.findByText('2 filas detectadas');
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Importar' }));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith('No se pudo importar', 'error'));
        expect(callbacks.onClose).not.toHaveBeenCalled();
        expect(screen.getByText('María Pérez')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Importar' }));
        await waitFor(() => expect(callbacks.onImportSuccess).toHaveBeenCalledTimes(1));
        expect(axios.post).toHaveBeenCalledTimes(2);
    });

    it.each([
        ['vacío.csv', 'Título,Cliente\n'],
        ['dañado.csv', 'Título,Cliente\n"texto sin cierre,María'],
        ['vacío.xlsx', new Uint8Array([])],
    ])('un archivo inválido (%s) muestra un error y permite elegir otro', async (name, content) => {
        open();
        choose(new File([content], name));
        await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), 'error'));
        expect(screen.queryByRole('button', { name: 'Confirmar e Importar' })).toBeNull();
        expect(axios.post).not.toHaveBeenCalled();
        choose(makeFile('csv'));
        await screen.findByText('2 filas detectadas');
    });

    it('rechaza extensiones no admitidas antes de leerlas', () => {
        open();
        choose(new File(['texto'], 'archivo.txt'));
        expect(showToast).toHaveBeenCalledWith(expect.any(String), 'warning');
        expect(axios.post).not.toHaveBeenCalled();
    });

    it('una lectura anterior lenta no reemplaza el archivo seleccionado después', async () => {
        let pendingReader;
        vi.spyOn(FileReader.prototype, 'readAsText').mockImplementationOnce(function () { pendingReader = this; });
        open();
        choose(new File(['Título,Cliente\nViejo,Anterior'], 'viejo.csv'));
        choose(makeFile('xlsx'));
        await screen.findByText('2 filas detectadas');
        await act(async () => {
            Object.defineProperty(pendingReader, 'result', { value: 'Título,Cliente\nViejo,Anterior' });
            pendingReader.onload(new Event('load'));
        });
        expect(screen.getByText('casos.xlsx')).toBeTruthy();
        expect(screen.queryByText('Anterior')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Importar' }));
        await waitFor(() => expect(axios.post).toHaveBeenCalledWith(api.cases.import,
            { cases: expectedCases }, expect.any(Object)));
    });
});
