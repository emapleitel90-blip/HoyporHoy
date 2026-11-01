import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import ViewCase from '../pages/ViewCase';
import { api } from '../config/api';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../components/DeadlinePanel', () => ({ DeadlinePanel: () => null }));
vi.mock('../components/ExpensePanel', () => ({ ExpensePanel: () => null }));
vi.mock('../components/CaseFilePanel', () => ({ CaseFilePanel: () => null }));
vi.mock('../components/JurisprudencePanel', () => ({ JurisprudencePanel: () => null }));
vi.mock('../components/TaskPanel', () => ({ TaskPanel: () => null }));
vi.mock('../components/CaseProgressSummary', () => ({ CaseProgressSummary: () => null }));
vi.mock('../components/FollowUpPanel', () => ({ FollowUpPanel: () => null }));
vi.mock('../components/FeePanel', () => ({ FeePanel: () => null }));
vi.mock('../components/WrittenDocumentsPanel', () => ({ WrittenDocumentsPanel: ({ caseId }) => <p>Escritos del expediente {caseId}</p> }));
const caseData = id => ({ id, caseNumber: 'EXP-' + id, title: 'Título ' + id, clientName: 'Cliente ' + id, status: 'OPEN', createdAt: '2026-10-28T15:00:00Z' });
const open = () => render(<MemoryRouter initialEntries={['/cases/a']}><Link to="/cases/b">Ir al segundo expediente</Link>
    <Routes><Route path="/cases/:id" element={<ViewCase />} /></Routes></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Carga del expediente que contiene los escritos', () => {
    it('reintenta la consulta real después de un fallo y muestra el expediente recuperado', async () => {
        axios.get.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce({ data: caseData('a') });
        open(); await screen.findByText('Ocurrió un error al cargar el expediente.');
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
        await screen.findByRole('heading', { name: 'Cliente a' });
        expect(screen.getByText('Escritos del expediente a')).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(2);
        for (const [url] of axios.get.mock.calls) expect(url).toBe(api.cases.get('a'));
    });

    it.each(['respuesta', 'error'])('ignora una %s antigua al cambiar de expediente', async outcome => {
        let resolveOld, rejectOld;
        axios.get.mockImplementationOnce(() => new Promise((resolve, reject) => { resolveOld = resolve; rejectOld = reject; }))
            .mockResolvedValueOnce({ data: caseData('b') });
        open(); fireEvent.click(screen.getByRole('link', { name: 'Ir al segundo expediente' }));
        await screen.findByRole('heading', { name: 'Cliente b' });
        await act(async () => { if (outcome === 'respuesta') resolveOld({ data: caseData('a') }); else rejectOld({ response: { status: 403 } }); });
        expect(screen.getByRole('heading', { name: 'Cliente b' })).toBeTruthy();
        expect(screen.getByText('Escritos del expediente b')).toBeTruthy();
        expect(screen.queryByRole('heading', { name: 'Cliente a' })).toBeNull();
        expect(screen.queryByText('No tenés permisos para acceder a este expediente.')).toBeNull();
    });
});
