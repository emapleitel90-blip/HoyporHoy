import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import MyDay from '../pages/MyDay';
import { api } from '../config/api';
import { formatLegalDate } from '../utils/agendaDates';

vi.mock('axios', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock('../components/LegalTimeline', () => ({ LegalTimeline: () => <h2>Cronograma</h2> }));
vi.mock('../components/TaskPanel', () => ({ TaskPanel: () => null }));
vi.mock('../components/FollowUpPanel', () => ({ FollowUpPanel: () => null }));
vi.mock('../components/FeePanel', () => ({ FeePanel: () => null }));

const overdue = {
    id: 'old', title: 'Contestar demanda', dueDate: '2026-09-30T03:00:00Z', caseId: 'case-a', editVersion: 2,
    caseNumber: 'EXP-2026-1', caseTitle: 'Expediente de prueba', assignedLawyer: 'Ana Pérez',
};
const open = () => render(<MemoryRouter><MyDay /></MemoryRouter>);

beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
    localStorage.setItem('lyp_token', 'test-token');
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
});

describe('Vencimientos atrasados en Mi jornada', () => {
    it('muestra un plazo antiguo junto al cronograma y lo retira solo tras confirmar el cumplimiento', async () => {
        let confirm;
        axios.get.mockResolvedValueOnce({ data: { overdue: [overdue] } })
            .mockResolvedValue({ data: { overdue: [] } });
        axios.put.mockImplementation(() => new Promise(resolve => { confirm = resolve; }));
        open();
        await screen.findByRole('heading', { name: overdue.title });
        expect(screen.getByRole('heading', { name: 'Cronograma' })).toBeTruthy();
        expect(screen.getByText('30/9/2026', { selector: 'time' })).toBeTruthy();
        expect(screen.getByText(/Ana Pérez/)).toBeTruthy();
        expect(screen.getByRole('link', { name: /EXP-2026-1/ }).getAttribute('href')).toBe('/cases/case-a');
        expect(axios.get).toHaveBeenCalledWith(api.deadlines.myDay, expect.objectContaining({
            headers: { Authorization: 'Bearer test-token' },
        }));

        fireEvent.click(screen.getByRole('button', { name: `Marcar como cumplido: ${overdue.title}` }));
        expect(screen.getByRole('heading', { name: overdue.title })).toBeTruthy();
        expect(axios.put).toHaveBeenCalledWith(api.deadlines.update(overdue.id), { isCompleted: true, version: overdue.editVersion }, expect.any(Object));
        await act(async () => confirm({ data: { id: overdue.id, isCompleted: true } }));
        expect(await screen.findByText('No hay vencimientos atrasados pendientes.')).toBeTruthy();
        expect(screen.queryByRole('heading', { name: overdue.title })).toBeNull();
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    });

    it('actualiza la jornada si alguien reprogramó el vencimiento antes de marcarlo', async () => {
        axios.get.mockResolvedValueOnce({ data: { overdue: [overdue] } }).mockResolvedValue({ data: { overdue: [] } });
        axios.put.mockRejectedValueOnce({ response: { status: 409 } });
        open();
        fireEvent.click(await screen.findByRole('button', { name: `Marcar como cumplido: ${overdue.title}` }));
        await screen.findByText('No hay vencimientos atrasados pendientes.');
        expect(screen.getByRole('alert').textContent).toContain('El vencimiento cambió');
        expect(axios.put).toHaveBeenCalledTimes(1);
    });

    it('conserva el vencimiento si falla el guardado y permite recuperar la carga tras un fallo inicial', async () => {
        axios.get.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({ data: { overdue: [overdue] } });
        axios.put.mockRejectedValueOnce(new Error('Sin conexión'));
        open();
        await screen.findByText('No se pudieron actualizar los vencimientos atrasados.');
        expect(screen.queryByText('No hay vencimientos atrasados pendientes.')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar vencimientos' }));
        await screen.findByRole('heading', { name: overdue.title });
        fireEvent.click(screen.getByRole('button', { name: `Marcar como cumplido: ${overdue.title}` }));
        expect(await screen.findByText(/No se pudo confirmar el cambio/)).toBeTruthy();
        expect(screen.getByRole('heading', { name: overdue.title })).toBeTruthy();
    });
});

it('distingue la fecha civil de un instante anterior a medianoche argentina', () => {
    expect(formatLegalDate('2027-01-01')).toBe('1/1/2027');
    expect(formatLegalDate('2027-01-01T02:59:00Z')).toBe('31/12/2026');
    expect(formatLegalDate('2027-02-30')).toBeNull();
});
