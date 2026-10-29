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
        downloadFile: (fileId) => `${API_URL}/api/cases/files/${fileId}/download`,
        deleteFile: (fileId) => `${API_URL}/api/cases/files/${fileId}`,
    },
    studios: {
        list: `${API_URL}/api/studios`,
        users: (studioId) => `${API_URL}/api/studios/${studioId}/users`,
    },
    tasks: {
        byCase: (caseId) => `${API_URL}/api/tasks/case/${caseId}`,
        create: (caseId) => `${API_URL}/api/tasks/case/${caseId}`,
        get: (id) => `${API_URL}/api/tasks/${id}`,
        start: (id) => `${API_URL}/api/tasks/${id}/start`,
        progress: (id) => `${API_URL}/api/tasks/${id}/progress`,
        submit: (id) => `${API_URL}/api/tasks/${id}/submit`,
        review: (id) => `${API_URL}/api/tasks/${id}/review`,
        myTasks: `${API_URL}/api/tasks/my-tasks`,
        reviewTasks: `${API_URL}/api/tasks/to-review`,
    },
    followUps: {
        byCase: (caseId) => `${API_URL}/api/follow-ups/case/${caseId}`,
        update: (id) => `${API_URL}/api/follow-ups/${id}`,
        action: (id) => `${API_URL}/api/follow-ups/${id}/actions`,
        mine: `${API_URL}/api/follow-ups/mine`,
        review: `${API_URL}/api/follow-ups/to-review`,
    },
    deadlines: {
        upcoming: `${API_URL}/api/deadlines/upcoming`,
        myDay: `${API_URL}/api/deadlines/my-day`,
        byCase: (id) => `${API_URL}/api/deadlines/case/${id}`,
        create: (id) => `${API_URL}/api/deadlines/case/${id}`,
        update: (id) => `${API_URL}/api/deadlines/${id}`,
        delete: (id) => `${API_URL}/api/deadlines/${id}`,
    },
    documents: {
        generate: `${API_URL}/api/documents/generate`,
    },
    writings: {
        templates: (caseId) => `${API_URL}/api/writings/templates/case/${caseId}`,
        byCase: (caseId) => `${API_URL}/api/writings/case/${caseId}`,
        get: (id) => `${API_URL}/api/writings/${id}`,
        version: (id, number) => `${API_URL}/api/writings/${id}/versions/${number}`,
        versions: (id) => `${API_URL}/api/writings/${id}/versions`,
        word: (id, number) => `${API_URL}/api/writings/${id}/versions/${number}/word`,
    },
    expenses: {
        receipt: (id) => `${API_URL}/api/expenses/${id}/receipt`,
        byCase: (id) => `${API_URL}/api/expenses/case/${id}`,
        create: (id) => `${API_URL}/api/expenses/case/${id}`,
        update: (id) => `${API_URL}/api/expenses/${id}`,
    },
    jurisprudence: {
        byCase: (id) => `${API_URL}/api/jurisprudencia/case/${id}`,
        search: `${API_URL}/api/jurisprudencia/search`,
        save: `${API_URL}/api/jurisprudencia/save`,
    },
    fees: {
        byCase: (id) => `${API_URL}/api/fees/case/${id}`,
        payment: (id) => `${API_URL}/api/fees/installments/${id}/payments`,
        reversePayment: (id) => `${API_URL}/api/fees/payments/${id}/reversal`,
        receipt: (id) => `${API_URL}/api/fees/payments/${id}/receipt`,
        amend: (caseId) => `${API_URL}/api/fees/case/${caseId}/amendments`,
        upcoming: `${API_URL}/api/fees/upcoming`,
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

