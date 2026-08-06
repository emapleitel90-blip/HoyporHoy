// Configuración centralizada de la API
// Cambiar solo aquí si el puerto del servidor cambia

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
    auth: {
        login: `${API_URL}/api/auth/login`,
    },
    cases: {
        list: `${API_URL}/api/cases`,
        create: `${API_URL}/api/cases`,
        get: (id) => `${API_URL}/api/cases/${id}`,
        update: (id) => `${API_URL}/api/cases/${id}`,
        import: `${API_URL}/api/cases/import`,
        stats: `${API_URL}/api/cases/stats`,
        addFile: (id) => `${API_URL}/api/cases/${id}/files`,
        deleteFile: (fileId) => `${API_URL}/api/cases/files/${fileId}`,
    },
    studios: {
        list: `${API_URL}/api/studios`,
    },
    deadlines: {
        upcoming: `${API_URL}/api/deadlines/upcoming`,
        byCase: (id) => `${API_URL}/api/deadlines/case/${id}`,
        create: (id) => `${API_URL}/api/deadlines/case/${id}`,
        update: (id) => `${API_URL}/api/deadlines/${id}`,
        delete: (id) => `${API_URL}/api/deadlines/${id}`,
    },
    documents: {
        generate: `${API_URL}/api/documents/generate`,
    },
    expenses: {
        byCase: (id) => `${API_URL}/api/expenses/case/${id}`,
        create: (id) => `${API_URL}/api/expenses/case/${id}`,
        update: (id) => `${API_URL}/api/expenses/${id}`,
    },
    jurisprudence: {
        search: `${API_URL}/api/jurisprudencia/search`,
        save: `${API_URL}/api/jurisprudencia/save`,
    },
    notifications: {
        list: `${API_URL}/api/notifications`,
        markRead: (id) => `${API_URL}/api/notifications/${id}/read`,
        markAllRead: `${API_URL}/api/notifications/mark-all-read`,
    },
    formConfig: {
        base: `${API_URL}/api/form-config`,
        get: `${API_URL}/api/form-config`,
        update: `${API_URL}/api/form-config`,
        reset: `${API_URL}/api/form-config/reset`,
    },
};

