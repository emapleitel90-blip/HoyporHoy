// Refresh server-backed counts only after a confirmed mutation; this creates no notice.
export const notifyActivityChanged = () => window.dispatchEvent(new Event('notifications-updated'));
