import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { argentinaDayBounds, parseDeadlineDate } from '../utils/argentinaTime.js';

describe('Calendario de Córdoba independiente de la zona del servidor', () => {
    it.each(['UTC', 'America/Argentina/Buenos_Aires', 'America/Los_Angeles', 'Asia/Tokyo'])(
        'mantiene los mismos límites y fechas cuando el servidor usa %s', timezone => {
            const moduleUrl = new URL('../utils/argentinaTime.js', import.meta.url).href;
            const script = `import { argentinaDayBounds, parseDeadlineDate } from ${JSON.stringify(moduleUrl)};
                console.log(JSON.stringify({
                    before: argentinaDayBounds(new Date('2026-10-26T02:59:59.999Z')),
                    after: argentinaDayBounds(new Date('2026-10-26T03:00:00.000Z')),
                    date: parseDeadlineDate('2026-10-26'),
                }));`;
            const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
                encoding: 'utf8', env: { ...process.env, TZ: timezone },
            }));
            expect(result).toEqual({
                before: { todayStart: '2026-10-25T03:00:00.000Z', tomorrowStart: '2026-10-26T03:00:00.000Z', upcomingEnd: '2026-11-02T03:00:00.000Z' },
                after: { todayStart: '2026-10-26T03:00:00.000Z', tomorrowStart: '2026-10-27T03:00:00.000Z', upcomingEnd: '2026-11-03T03:00:00.000Z' },
                date: '2026-10-26T03:00:00.000Z',
            });
        });

    it.each([
        ['2026-12-31T15:00:00Z', '2027-01-01T03:00:00.000Z', '2027-01-08T03:00:00.000Z'],
        ['2028-02-28T15:00:00Z', '2028-02-29T03:00:00.000Z', '2028-03-07T03:00:00.000Z'],
    ])('resuelve cambios de año y años bisiestos desde %s', (now, tomorrow, end) => {
        const result = argentinaDayBounds(new Date(now));
        expect(result.tomorrowStart.toISOString()).toBe(tomorrow);
        expect(result.upcomingEnd.toISOString()).toBe(end);
    });

    it('mantiene el mismo instante al recibir offsets diferentes equivalentes', () => {
        expect(parseDeadlineDate('2026-10-26T09:30-03:00')).toEqual(parseDeadlineDate('2026-10-26T12:30Z'));
    });
});
