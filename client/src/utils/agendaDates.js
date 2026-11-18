export const AGENDA_ZONE = 'America/Argentina/Cordoba';
export const dayKey = value => {
    const parts = new Intl.DateTimeFormat('en', { timeZone: AGENDA_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
    const get = type => parts.find(part => part.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
};
export const shiftDay = (day, amount) => {
    const date = new Date(`${day}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
};
export const fullDay = day => new Date(`${day}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: AGENDA_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const clockTime = value => new Date(value).toLocaleTimeString('es-AR', { timeZone: AGENDA_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const activityDate = (day, time) => time ? `${day}T${time}:00-03:00` : day;

const numericDate = { day: 'numeric', month: 'numeric', year: 'numeric' };
const shortDate = new Intl.DateTimeFormat('es-AR', { ...numericDate, timeZone: AGENDA_ZONE });
const civilDate = new Intl.DateTimeFormat('es-AR', { ...numericDate, timeZone: 'UTC' });

export function formatLegalDate(value) {
    if (typeof value !== 'string' || !value) return null;
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
    if (!Number.isFinite(date.getTime())) return null;
    if (dateOnly && date.toISOString().slice(0, 10) !== value) return null;
    return (dateOnly ? civilDate : shortDate).format(date);
}
