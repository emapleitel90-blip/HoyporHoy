import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { FollowUpPanel } from '../components/FollowUpPanel';
vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'lawyer', role: 'LAWYER' } }) }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });
it('informa el cambio confirmado aunque falle la recarga posterior y no informa el intento fallido', async () => {
    const item = { id: 'doc', caseId: 'case', kind: 'DOCUMENT', status: 'RECEIVED',
        title: 'Documento de prueba', ownerId: 'lawyer', owner: { name: 'Abogada' }, events: [], updatedAt: 'version' };
    axios.get.mockResolvedValueOnce({ data: [item] }).mockRejectedValueOnce(new Error('offline'));
    axios.post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: {} });
    const onChanged = vi.fn();
    const dispatch = vi.spyOn(window, 'dispatchEvent');
    render(<FollowUpPanel caseItem={{ id: 'case', files: [] }} onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Verificar documento' }));
    await screen.findByRole('alert');
    expect(onChanged).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Verificar documento' }).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Verificar documento' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    await screen.findByText('No se pudo cargar el seguimiento.');
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'notifications-updated' }));
});
