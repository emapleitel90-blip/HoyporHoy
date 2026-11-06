import { Button } from '../components/ui/button';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, duration);
    }, []);

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-status-green" />,
        error: <AlertCircle className="w-5 h-5 text-status-red" />,
        info: <Info className="w-5 h-5 text-link" />,
        warning: <AlertTriangle className="w-5 h-5 text-status-yellow" />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200 text-status-green',
        error: 'bg-red-50 border-red-200 text-status-red',
        info: 'bg-blue-50 border-ring text-link',
        warning: 'bg-yellow-50 border-yellow-200 text-status-yellow',
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start p-4 rounded-xl shadow-xl border ${bgColors[toast.type]} min-w-[320px] max-w-md transition-all duration-300 transform animate-toast-in`}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {icons[toast.type]}
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-semibold">{toast.message}</p>
                        </div>
                        <Button variant="legacy" size="legacy"
                            onClick={() => removeToast(toast.id)}
                            className="ml-4 flex-shrink-0 text-muted-foreground hover:text-secondary-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
