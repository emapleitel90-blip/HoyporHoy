export const STUDIO_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' });

export const studioSuspendedMessage = 'Tu estudio está suspendido. Contactá al administrador de la plataforma.';

export const canAccessStudio = user => user.studioId === null || user.studio?.status === STUDIO_STATUS.ACTIVE;
