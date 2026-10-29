import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { JurisprudencePanel } from '../components/JurisprudencePanel';
import { api } from '../config/api';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const reference = { id: 'ref-a', titulo: 'Referencia consultada', tribunal: 'Tribunal', fecha: '2026-10-19',
    url: 'https://www.saij.gob.ar/documento-prueba', extracto: 'Nota de lectura', verification: 'USER_PROVIDED', source: 'SAIJ' };
const fill = () => {
    for (const [label, value] of [['Título del fallo', reference.titulo], ['Tribunal', reference.tribunal],
        ['Fecha del fallo', reference.fecha], ['Enlace oficial del documento', reference.url],
        ['Extracto o notas de lectura (opcional)', reference.extracto]]) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
};
beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('lyp_token', 'token');
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: reference });
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Jurisprudencia sin IA', () => {
    it('filtra sin distinguir acentos, combina origen y permite recuperar todos los registros', async () => {
        axios.get.mockResolvedValue({data:[{...reference,tribunal:'Cámara de Córdoba'},
            {id:'old',title:'Histórico Córdoba',description:'Nota anterior',verification:'LEGACY_UNVERIFIED'}]});
        render(<JurisprudencePanel caseId="case-a" />);
        await screen.findByText('2 de 2 referencias');
        fireEvent.change(screen.getByLabelText('Buscar en referencias guardadas'),{target:{value:'CAMARA'}});
        expect(screen.getByText('1 de 2 referencias')).toBeTruthy();
        expect(screen.queryByText('Histórico Córdoba')).toBeNull();
        fireEvent.change(screen.getByLabelText('Origen del registro'),{target:{value:'HISTORICAL'}});
        expect(screen.getByText('No hay referencias que coincidan con los filtros.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button',{name:'Limpiar filtros de referencias'}));
        expect(screen.getByText('2 de 2 referencias')).toBeTruthy();
        expect(screen.getByText('Histórico Córdoba')).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.post).not.toHaveBeenCalled();
    });
    it('ofrece portales sin solicitar claves y guarda solo los datos ingresados', async () => {
        localStorage.setItem('lyp_openai_key', 'obsolete-secret');
        render(<JurisprudencePanel caseId="case-a" />);
        await screen.findByText('Sin referencias guardadas.');
        expect(screen.getByRole('link', { name: 'Abrir SAIJ' }).href).toBe('https://www.saij.gob.ar/buscador/');
        expect(screen.queryByText('Configurar API')).toBeNull();
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar referencia' }));
        await screen.findByText('Referencia guardada en el expediente.');
        expect(axios.post).toHaveBeenCalledWith(api.jurisprudence.save, {
            caseId: 'case-a', insightData: { titulo: reference.titulo, tribunal: reference.tribunal,
                fecha: reference.fecha, url: reference.url, extracto: reference.extracto },
        }, { headers: { Authorization: 'Bearer token' } });
        expect(screen.getByText(/contenido sin verificación automática/)).toBeTruthy();
    });

    it('conserva el formulario tras un error y permite reintentar', async () => {
        axios.post.mockRejectedValueOnce(new Error('offline'));
        render(<JurisprudencePanel caseId="case-a" />);
        await screen.findByText('Sin referencias guardadas.');
        fill();
        fireEvent.click(screen.getByRole('button', { name: 'Guardar referencia' }));
        await screen.findByRole('alert');
        expect(screen.getByLabelText('Título del fallo').value).toBe(reference.titulo);
        fireEvent.click(screen.getByRole('button', { name: 'Guardar referencia' }));
        await screen.findByText('Referencia guardada en el expediente.');
    });

    it('muestra errores de carga y recupera registros históricos sin enlaces activos', async () => {
        axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [
            { id: 'old', title: 'Anterior', description: 'https://example.invalid', verification: 'LEGACY_UNVERIFIED' },
        ] });
        render(<JurisprudencePanel caseId="case-a" />);
        await screen.findByRole('alert');
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));
        await screen.findByText('Registro histórico sin verificar');
        expect(screen.queryByRole('link', { name: 'Consultar documento oficial' })).toBeNull();
    });

    it('descarta respuestas pendientes al cambiar de expediente', async () => {
        let resolve;
        axios.get.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
        const { rerender } = render(<JurisprudencePanel caseId="case-a" />);
        rerender(<JurisprudencePanel caseId="case-b" />);
        await screen.findByText('Sin referencias guardadas.');
        await act(async () => resolve({ data: [reference] }));
        expect(screen.queryByText(reference.titulo)).toBeNull();
        await waitFor(() => expect(axios.get).toHaveBeenLastCalledWith(api.jurisprudence.byCase('case-b'), expect.any(Object)));
    });
});
