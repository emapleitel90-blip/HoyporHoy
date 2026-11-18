import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { DeadlinePanel } from '../components/DeadlinePanel';
import { api } from '../config/api';
import { notifyActivityChanged } from '../utils/activityEvents';
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../utils/activityEvents', () => ({ notifyActivityChanged: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const deadline = { id: 'deadline', caseId: 'case', title: 'Presentar escrito', dueDate: '2026-11-03T03:00:00Z', isCompleted: false, editVersion: 0 };
const fill = () => {
    fireEvent.change(screen.getByLabelText('Descripción del vencimiento'), { target: { value: deadline.title } });
    fireEvent.change(screen.getByLabelText('Fecha del vencimiento'), { target: { value: '2026-11-03' } });
};
it('conserva el formulario tras un fallo y confirma creación y cambio de estado sin recarga adicional', async () => {
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: deadline });
    axios.put.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: { ...deadline, isCompleted: true } });
    render(<DeadlinePanel caseId="case" />);
    await screen.findByText('No hay plazos registrados.'); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Descripción del vencimiento').value).toBe(deadline.title);
    expect(screen.getByLabelText('Fecha del vencimiento').value).toBe('2026-11-03');
    expect(notifyActivityChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    await screen.findByText('Vencimiento guardado.');
    expect(screen.getByLabelText('Descripción del vencimiento').value).toBe('');
    expect(notifyActivityChanged).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Completar vencimiento: Presentar escrito' }));
    await screen.findByRole('alert');
    expect(notifyActivityChanged).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Completar vencimiento: Presentar escrito' }));
    await screen.findByRole('button', { name: 'Reabrir vencimiento: Presentar escrito' });
    expect(notifyActivityChanged).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledTimes(1);
});
it('distingue una carga fallida de una lista vacía y permite recuperar', async () => {
    axios.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: [deadline] });
    render(<DeadlinePanel caseId="case" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('No hay plazos registrados.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Añadir' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar vencimientos' }));
    await screen.findByText(deadline.title);
    expect(screen.queryByRole('alert')).toBeNull();
});
it('bloquea dos envíos del mismo formulario mientras espera confirmación', async () => {
    axios.get.mockResolvedValue({ data: [] }); let finish;
    axios.post.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<DeadlinePanel caseId="case" />);
    await screen.findByText('No hay plazos registrados.'); fill();
    const form = screen.getByRole('button', { name: 'Añadir' }).closest('form');
    fireEvent.submit(form); fireEvent.submit(form);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Descripción del vencimiento').disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Actualizar vencimientos' }).disabled).toBe(true);
    await act(async () => finish({ data: deadline }));
    await screen.findByText('Vencimiento guardado.');
});
it.each(['load', 'save'])('descarta una respuesta antigua de %s al cambiar de expediente', async operation => {
    let finish;
    axios.get.mockResolvedValue({ data: [] });
    if (operation === 'load') axios.get.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    else axios.post.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { rerender } = render(<DeadlinePanel caseId="case" />);
    if (operation === 'save') {
        await screen.findByText('No hay plazos registrados.'); fill();
        fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    }
    rerender(<DeadlinePanel caseId="other" />);
    await screen.findByText('No hay plazos registrados.');
    await act(async () => finish({ data: operation === 'load' ? [deadline] : deadline }));
    expect(screen.queryByText(deadline.title)).toBeNull();
    expect(screen.queryByText('Vencimiento guardado.')).toBeNull();
    expect(screen.getByLabelText('Descripción del vencimiento').value).toBe('');
});
it('rechaza respuestas de otro expediente y recupera con una consulta válida', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ ...deadline, caseId: 'other' }] }).mockResolvedValueOnce({ data: [] });
    render(<DeadlinePanel caseId="case" />);
    await screen.findByRole('alert');
    expect(screen.queryByText(deadline.title)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar vencimientos' }));
    await screen.findByText('No hay plazos registrados.');
});
it('rechaza una confirmación inválida sin borrar el formulario ni emitir actividad', async () => {
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: { ...deadline, caseId: 'other' } });
    render(<DeadlinePanel caseId="case" />);
    await screen.findByText('No hay plazos registrados.'); fill();
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }));
    await screen.findByRole('alert');
    expect(notifyActivityChanged).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Descripción del vencimiento').value).toBe(deadline.title);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Añadir' }).disabled).toBe(false));
});

it('agenda la fecha civil solo después de confirmar y conserva el formulario manual', async () => {
    axios.get.mockResolvedValue({ data: [] });
    const confirmed = { ...deadline, title: 'Prescripción', dueDate: '2027-01-01T03:00:00Z', source: 'ADMISSION_PRESCRIPTION', sourceDate: '2027-01-01' };
    axios.post.mockResolvedValue({ data: confirmed });
    render(<DeadlinePanel caseId="case" prescriptionDate="2027-01-01" canConfirmPrescription />);
    await screen.findByText('No hay plazos registrados.');
    fill();
    expect(screen.getByText('Prescripción estimada · 1/1/2027')).toBeTruthy();
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar fecha de prescripción' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar confirmación' }));
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Revisar fecha de prescripción' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y agendar' }));
    await screen.findByText('Fecha de prescripción confirmada en la agenda.');
    expect(axios.post).toHaveBeenCalledWith(api.deadlines.confirmPrescription('case'), { date: '2027-01-01' }, expect.any(Object));
    expect(screen.getByText('Vence: 1/1/2027')).toBeTruthy();
    expect(screen.getByText(/Origen: fecha de prescripción confirmada/)).toBeTruthy();
    expect(screen.getByLabelText('Descripción del vencimiento').value).toBe(deadline.title);
    expect(screen.queryByRole('button', { name: 'Revisar fecha de prescripción' })).toBeNull();
});

it('ofrece vincular el vencimiento existente del mismo día', async () => {
    const existing = { ...deadline, title: 'Prescripción laboral', dueDate: '2027-01-02T01:00:00Z' };
    axios.get.mockResolvedValue({ data: [existing] });
    axios.post.mockResolvedValue({ data: { ...existing, source: 'ADMISSION_PRESCRIPTION', sourceDate: '2027-01-01' } });
    render(<DeadlinePanel caseId="case" prescriptionDate="2027-01-01" canConfirmPrescription />);
    await screen.findByText(existing.title);
    fireEvent.click(screen.getByRole('button', { name: 'Revisar fecha de prescripción' }));
    expect(screen.getByRole('button', { name: 'Confirmar y agendar' }).disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: 'Vencimiento de agenda' }), { target: { value: existing.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y vincular' }));
    await screen.findByText('Fecha de prescripción confirmada en la agenda.');
    expect(axios.post).toHaveBeenCalledWith(api.deadlines.confirmPrescription('case'), { date: '2027-01-01', deadlineId: existing.id, version: existing.editVersion }, expect.any(Object));
    expect(screen.getAllByText(existing.title)).toHaveLength(1);
});
