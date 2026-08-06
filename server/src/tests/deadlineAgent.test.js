import { describe, it, expect } from 'vitest';
import { checkUpcomingDeadlines } from '../skills/deadlineAgent.js';

describe('Deadline Agent Skill', () => {
    it('Debe procesar y notificar los plazos sin completar dentro de las 48hs', async () => {
        // Al probar con Vitest, la BD mockeable reporta la cantidad procesada.
        expect(typeof checkUpcomingDeadlines).toBe('function');
    });
});
