import { expect, it } from 'vitest';
import { followUpDateInput, followUpDateISO, followUpDateLabel } from '../utils/followUpTime';
it('conserva la hora acordada de Córdoba al guardar, editar y mostrar', () => {
    const value = '2026-10-29T18:00';
    expect(followUpDateISO(value)).toBe('2026-10-29T21:00:00.000Z');
    expect(followUpDateInput(followUpDateISO(value))).toBe(value);
    expect(followUpDateLabel(followUpDateISO(value))).toContain('18:00');
    expect(followUpDateInput('2026-10-30T02:30:00Z')).toBe('2026-10-29T23:30');
    expect(followUpDateISO('')).toBeNull();
    expect(followUpDateInput(null)).toBe('');
});
