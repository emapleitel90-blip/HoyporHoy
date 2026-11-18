import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CaseList from '../pages/CaseList';
import { api } from '../config/api';

vi.mock('../components/DataImportModal', () => ({ DataImportModal: () => null }));
vi.mock('../context/AuthContext', () => {
    const getToken = () => 'test';
    return { useAuth: () => ({ getToken }) };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('muestra prioridad y próxima acción y vuelve a consultar al filtrar y limpiar', async () => {
    const urgent = {
        id: '1', clientName: 'Consultante uno', priority: 'URGENT', status: 'OPEN', createdAt: '2026-11-13',
        nextAction: { title: 'Pedir documentación', status: 'PENDING', assignee: { name: 'Emanuel' } },
    };
    const normal = { id: '2', clientName: 'Consultante dos', priority: 'MEDIUM', status: 'OPEN', createdAt: '2026-11-13' };
    const fetchCases = vi.fn(async url => ({ ok: true, json: async () => url.includes('priority=URGENT') ? [urgent] : [urgent, normal] }));
    vi.stubGlobal('fetch', fetchCases);

    render(<MemoryRouter><CaseList /></MemoryRouter>);
    const row = await screen.findByRole('row', { name: /Consultante uno/ });
    expect(within(row).getByRole('cell', { name: 'Urgente' })).toBeTruthy();
    expect(within(row).getByText('Próxima: Pedir documentación')).toBeTruthy();
    expect(screen.getByText('Consultante dos')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Prioridad' }), { target: { value: 'URGENT' } });
    await waitFor(() => expect(fetchCases).toHaveBeenLastCalledWith(`${api.cases.list}?priority=URGENT`, expect.anything()));
    await screen.findByRole('row', { name: /Consultante uno/ });
    expect(screen.queryByText('Consultante dos')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    await screen.findByText('Consultante dos');
    expect(fetchCases).toHaveBeenLastCalledWith(api.cases.list, expect.anything());
});
