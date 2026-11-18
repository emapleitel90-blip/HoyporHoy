import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import axios from 'axios';
import { NextActionPanel } from '../components/NextActionPanel';
import { api } from '../config/api';
vi.mock('axios', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
let data;
const action = { id: 'task', title: 'Solicitar documentos', dueDate: '2026-11-10T03:00:00Z', status: 'PENDING', assigneeId: 'me', assignee: { id: 'me', name: 'Abogada' }, updatedAt: '2026-11-06T15:00:00Z' };
beforeEach(() => {
    data = { nextAction: null, users: [{ id: 'me', name: 'Abogada' }], canEdit: true, canAssign: true, canComplete: true, defaultAssigneeId: 'me' };
    axios.get.mockImplementation(async () => ({ data: { ...data } }));
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('guarda la próxima acción con responsable y fecha y luego permite definir la siguiente tras cumplirla', async () => {
    axios.put.mockImplementation(async url => {
        data.nextAction = url === api.cases.nextAction('case') ? { ...action } : { ...action, status: 'COMPLETED' };
        return { data: {} };
    });
    render(<NextActionPanel caseId="case" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Definir próxima acción' }));
    fireEvent.change(screen.getByLabelText('Qué hay que hacer'), { target: { value: action.title } });
    fireEvent.change(screen.getByLabelText('Fecha de la próxima acción'), { target: { value: '2026-11-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar próxima acción' }));
    await screen.findByText(action.title);
    expect(axios.put).toHaveBeenCalledWith(api.cases.nextAction('case'), expect.objectContaining({ title: action.title, assigneeId: 'me', dueDate: '2026-11-10', expectedTaskId: null }), expect.any(Object));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar acción cumplida' }));
    await screen.findByRole('button', { name: 'Definir próxima acción' });
    expect(axios.put).toHaveBeenLastCalledWith(api.agenda.updateTask('task'), { completed: true, updatedAt: action.updatedAt }, expect.any(Object));
});
it('conserva el formulario al detectar una edición simultánea', async () => {
    data.nextAction = { ...action };
    axios.put.mockRejectedValue({ response: { data: { message: 'La próxima acción cambió' } } });
    render(<NextActionPanel caseId="case" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar próxima acción' }));
    fireEvent.change(screen.getByLabelText('Qué hay que hacer'), { target: { value: 'Revisar documentación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar próxima acción' }));
    await screen.findByText('La próxima acción cambió');
    expect(screen.getByLabelText('Qué hay que hacer').value).toBe('Revisar documentación');
    expect(axios.put.mock.calls[0][1]).toMatchObject({ expectedTaskId: 'task', expectedUpdatedAt: action.updatedAt });
});
it('no presenta ausencia de acción cuando falla la consulta ni ofrece cambios sin permiso', async () => {
    axios.get.mockRejectedValueOnce(new Error('offline'));
    data = { ...data, nextAction: { ...action }, canEdit: false, canComplete: false };
    render(<NextActionPanel caseId="case" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('Este expediente todavía no tiene una próxima acción definida.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar acción' }));
    await screen.findByText(action.title);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Editar próxima acción' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Marcar acción cumplida' })).toBeNull();
});
