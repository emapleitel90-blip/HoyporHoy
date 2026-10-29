export const ARGENTINA_TIME_ZONE = 'America/Argentina/Cordoba';

const calendar = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

const calendarParts = date => Object.fromEntries(calendar.formatToParts(date)
    .filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));

// Convert a calendar midnight in Córdoba to an instant, independent of the host's TZ.
const midnight = (year, month, day) => {
    const target = Date.UTC(year, month - 1, day);
    let instant = target;
    for (let attempt = 0; attempt < 3; attempt++) {
        const local = calendarParts(new Date(instant));
        const delta = target - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
        if (delta === 0) return new Date(instant);
        instant += delta;
    }
    throw new RangeError('No se pudo determinar el inicio del día en Córdoba');
};

export const argentinaDayBounds = (now = new Date()) => {
    const { year, month, day } = calendarParts(now);
    return {
        todayStart: midnight(year, month, day),
        tomorrowStart: midnight(year, month, day + 1),
        upcomingEnd: midnight(year, month, day + 8),
    };
};

// Date-only values from the agenda mean the start of that calendar day in Córdoba.
// Timestamps must include their offset so the server's timezone cannot change them.
export const parseDeadlineDate = value => {
    if (typeof value !== 'string') return null;
    const day = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
    const calendarDate = new Date(`${day}T00:00:00Z`);
    if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== day) return null;
    if (value === day) {
        const [year, month, date] = day.split('-').map(Number);
        // Date.UTC treats years 0..99 as 1900..1999; those years are not supported.
        if (year < 100) return null;
        return midnight(year, month, date);
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
    const result = new Date(value);
    return Number.isFinite(result.getTime()) ? result : null;
};
