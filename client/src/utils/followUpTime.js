const zone = 'America/Argentina/Cordoba';
export const followUpDateLabel = value => new Date(value).toLocaleString('es-AR', { timeZone: zone, hourCycle: 'h23' });
export const followUpDateInput = value => {
    if (!value) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
export const followUpDateISO = value => value ? new Date(`${value}:00-03:00`).toISOString() : null;
