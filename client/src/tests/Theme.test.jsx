import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import ThemeSelect from '../components/ThemeSelect';

let media;
let listener;
beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    media = { matches: false, addEventListener: vi.fn((_, callback) => { listener = callback; }), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn(() => media));
});
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
});
const open = () => render(<ThemeProvider><ThemeSelect /></ThemeProvider>);

describe('Preferencia visual del estudio', () => {
    it('persiste la elección y la recupera al volver a abrir la aplicación', () => {
        const view = open();
        fireEvent.change(screen.getByRole('combobox', { name: 'Tema de la interfaz' }), { target: { value: 'dark' } });
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('lyp-theme')).toBe('dark');
        view.unmount();
        open();
        expect(screen.getByRole('combobox').value).toBe('dark');
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'light' } });
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe('light');
    });
    it('sigue al sistema y deja de seguirlo cuando se elige un tema explícito', () => {
        open();
        act(() => { media.matches = true; listener(); });
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'light' } });
        act(() => listener());
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    it('sincroniza cambios desde otra pestaña sin tocar la sesión', () => {
        localStorage.setItem('lyp_token', 'session-token');
        open();
        act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'lyp-theme', newValue: 'dark' })));
        expect(screen.getByRole('combobox').value).toBe('dark');
        expect(localStorage.getItem('lyp_token')).toBe('session-token');
    });
    it('usa el sistema ante una preferencia guardada inválida', () => {
        localStorage.setItem('lyp-theme', 'invalid');
        media.matches = true;
        open();
        expect(screen.getByRole('combobox').value).toBe('system');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
