import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ theme: 'system', setTheme: () => {} });
const storageKey = 'lyp-theme';

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            return ['light', 'dark', 'system'].includes(saved) ? saved : 'system';
        } catch { return 'system'; }
    });

    useEffect(() => {
        const media = window.matchMedia?.('(prefers-color-scheme: dark)');
        const apply = () => {
            const dark = theme === 'dark' || (theme === 'system' && media?.matches);
            document.documentElement.classList.toggle('dark', !!dark);
            document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        };
        apply();
        media?.addEventListener?.('change', apply);
        try { localStorage.setItem(storageKey, theme); } catch { /* Private browsing may disable storage. */ }
        return () => media?.removeEventListener?.('change', apply);
    }, [theme]);

    useEffect(() => {
        const sync = event => {
            if (event.key === storageKey) setTheme(['light', 'dark', 'system'].includes(event.newValue) ? event.newValue : 'system');
        };
        window.addEventListener('storage', sync);
        return () => window.removeEventListener('storage', sync);
    }, []);

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
