import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { LegalTimeline } from '../components/LegalTimeline';
import { api } from '../config/api';
import { dayKey, shiftDay, activityDate } from '../utils/agendaDates';

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../components/DeadlinePanel', () => ({ DeadlinePanel: ({ caseId, initialDate }) => <p>Agenda existente: {caseId} · {initialDate}</p> }));
let activities;
const task = {
    id: 'task:one', sourceId: 'one', source: 'TASK', kind: 'TASK', title: 'Llamar al cliente',
    date: '2026-11-06T14:30:00Z', priority: 'HIGH', status: 'PENDING', completed: false,
    assignee: { id: 'me', name: 'Abogada' }, case: null, canEdit: true, canComplete: true, updatedAt: '2026-11-01T12:00:00Z',
};
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-06T15:00:00Z'));
    localStorage.setItem('lyp_token', 'test-token'); activities = [{ ...task }];
    axios.get.mockImplementation(async url => url === api.agenda.options
        ? { data: { cases: [{ id: 'case', title: 'Expediente de prueba', caseNumber: 'EXP-1' }], users: [], canAssign: false } }
        : { data: { activities: [...activities] } });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.useRealTimers(); localStorage.clear(); });
const open = props => render(<MemoryRouter><LegalTimeline {...props} /></MemoryRouter>);

describe('Cronograma jurídico', () => {
    it('agrupa fechas argentinas, muestra volumen real, selecciona fechas y vuelve a hoy', async () => {
        activities.push({ ...task, id: 'deadline:two', sourceId: 'two', source: 'DEADLINE', kind: 'HEARING', title: 'Audiencia', date: '2026-11-07T02:30:00Z' });
        open();
        await screen.findByText('Llamar al cliente');
        expect(screen.getByRole('button', { name: /viernes, 6 de noviembre de 2026: 2 actividades, hoy/ }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByText('Audiencia', { selector: 'h4' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /sábado, 7 de noviembre de 2026: 0 actividades/ }));
        expect(screen.getByText('No hay actividades registradas para este día.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Hoy', exact: true }));
        expect(screen.getByText('Llamar al cliente')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Fechas siguientes' }));
        await waitFor(() => expect(axios.get.mock.calls.some(([, options]) => options.params?.start === '2026-11-10')).toBe(true));
    });
    it('crea con la fecha seleccionada y hora argentina y refresca solo después de confirmar', async () => {
        const changed = vi.fn();
        axios.post.mockImplementation(async (_, body) => { activities.push({ ...task, id: 'task:new', title: body.title, date: '2026-11-06T17:20:00Z' }); return { data: {} }; });
        open({ onChanged: changed }); await screen.findByText('Llamar al cliente');
        fireEvent.click(screen.getByRole('button', { name: 'Agregar tarea', exact: true }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText('Fecha').value).toBe('2026-11-06');
        fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Revisar documentación' } });
        fireEvent.change(within(dialog).getByLabelText('Hora (Argentina, opcional)'), { target: { value: '14:20' } });
        fireEvent.change(within(dialog).getByLabelText('Prioridad'), { target: { value: 'URGENT' } });
        await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Guardar actividad' }).disabled).toBe(false));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar actividad' }));
        await screen.findByText('Revisar documentación');
        expect(axios.post).toHaveBeenCalledWith(api.agenda.createTask, expect.objectContaining({ dueDate: '2026-11-06T14:20:00-03:00', priority: 'URGENT', caseId: null }), expect.any(Object));
        expect(changed).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).toBeNull();
    });
    it('conserva el formulario tras fallar el guardado y no inventa una actividad', async () => {
        axios.post.mockRejectedValue({ response: { data: { message: 'No se pudo guardar' } } });
        open(); await screen.findByText('Llamar al cliente'); fireEvent.click(screen.getByRole('button', { name: 'Agregar tarea', exact: true }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Título'), { target: { value: 'Pendiente de confirmar' } });
        await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Guardar actividad' }).disabled).toBe(false));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar actividad' }));
        await screen.findByText('No se pudo guardar');
        expect(within(dialog).getByLabelText('Título').value).toBe('Pendiente de confirmar');
        expect(screen.queryByText('Pendiente de confirmar', { selector: 'h4' })).toBeNull();
    });
    it('completa tareas con control de versión y respeta las que necesitan revisión', async () => {
        activities.push({ ...task, id: 'task:review', sourceId: 'review', title: 'Preparar recurso', reviewRequired: true, canComplete: false, case: { id: 'case', caseNumber: 'EXP-1', title: 'Expediente' } });
        axios.put.mockImplementation(async () => { activities[0] = { ...activities[0], completed: true, status: 'COMPLETED' }; return { data: {} }; });
        open(); await screen.findByText('Llamar al cliente');
        expect(screen.queryByRole('button', { name: 'Completar: Preparar recurso' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Completar: Llamar al cliente' }));
        await screen.findByRole('button', { name: 'Reabrir: Llamar al cliente' });
        expect(axios.put).toHaveBeenCalledWith(api.agenda.updateTask('one'), { completed: true, updatedAt: task.updatedAt }, expect.any(Object));
        expect(screen.getByRole('link', { name: /EXP-1/ }).getAttribute('href')).toBe('/cases/case');
    });
    it('reprograma y reutiliza la agenda de plazos con la fecha seleccionada', async () => {
        axios.put.mockResolvedValue({ data: {} }); open(); await screen.findByText('Llamar al cliente');
        fireEvent.click(screen.getByRole('button', { name: 'Editar o reprogramar: Llamar al cliente' }));
        fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-07' } });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar actividad' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(axios.put).toHaveBeenCalledWith(api.agenda.updateTask('one'), expect.objectContaining({ dueDate: '2026-11-07T11:30:00-03:00', updatedAt: task.updatedAt }), expect.any(Object));
        fireEvent.click(screen.getByRole('button', { name: 'Nuevo plazo' }));
        const picker = await screen.findByLabelText('Expediente');
        await waitFor(() => expect(picker.disabled).toBe(false));
        fireEvent.change(picker, { target: { value: 'case' } });
        expect(screen.getByText('Agenda existente: case · 2026-11-07')).toBeTruthy();
    });
    it('no muestra un estado vacío falso cuando falla la consulta', async () => {
        axios.get.mockRejectedValue(new Error('offline')); open();
        await screen.findByRole('alert');
        expect(screen.queryByText('No hay actividades registradas para este día.')).toBeNull();
        expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    });

    it('conserva el borrador de un vencimiento en conflicto y actualiza al descartarlo', async () => {
        const deadline = { ...task, id: 'deadline:two', sourceId: 'two', source: 'DEADLINE', kind: 'DEADLINE', title: 'Presentar demanda',
            editVersion: 0, case: { id: 'case', title: 'Expediente de prueba', caseNumber: 'EXP-1' } };
        activities = [deadline];
        axios.put.mockImplementation(async () => {
            activities = [{ ...deadline, title: 'Plazo actualizado por otra persona', editVersion: 1 }];
            throw { response: { status: 409, data: { message: 'El vencimiento cambió.' } } };
        });
        open();
        fireEvent.click(await screen.findByRole('button', { name: 'Editar o reprogramar: Presentar demanda' }));
        const dialog = within(screen.getByRole('dialog'));
        fireEvent.change(dialog.getByLabelText('Título'), { target: { value: 'Mi borrador' } });
        fireEvent.click(dialog.getByRole('button', { name: 'Guardar actividad' }));
        await dialog.findByText('El vencimiento cambió.');
        expect(dialog.getByLabelText('Título').value).toBe('Mi borrador');
        expect(dialog.getByRole('button', { name: 'Guardar actividad' }).disabled).toBe(true);
        expect(dialog.getByRole('link', { name: 'Ver vencimientos guardados' }).target).toBe('_blank');
        expect(axios.put).toHaveBeenCalledWith(api.deadlines.update('two'), expect.objectContaining({ title: 'Mi borrador', version: 0 }), expect.any(Object));
        fireEvent.click(dialog.getByRole('button', { name: 'Descartar borrador y actualizar cronograma' }));
        await screen.findByText('Plazo actualizado por otra persona');
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
it('mantiene la fecha civil argentina al cruzar medianoche y fin de mes', () => {
    expect(dayKey('2026-11-07T02:59:00Z')).toBe('2026-11-06');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(activityDate('2026-11-06', '')).toBe('2026-11-06');
});
