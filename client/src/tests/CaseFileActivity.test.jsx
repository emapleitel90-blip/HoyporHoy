import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { CaseFilePanel } from '../components/CaseFilePanel';
vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('solicita actualizar la actividad solo al confirmar la carga de un archivo', async () => {
    const changed = vi.fn();
    window.addEventListener('notifications-updated', changed);
    try {
        axios.post.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: {
            id: 'file', name: 'demo.pdf', createdAt: '2026-11-01T12:00:00Z'
        } });
        render(<CaseFilePanel caseId="case" />);
        const input = screen.getByLabelText('Subir archivo al expediente');
        const file = new File(['demo'], 'demo.pdf', { type: 'application/pdf' });
        fireEvent.change(input, { target: { files: [file] } });
        await waitFor(() => expect(input.disabled).toBe(false));
        expect(changed).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { files: [file] } });
        await screen.findByText('demo.pdf');
        expect(changed).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener('notifications-updated', changed); }
});
