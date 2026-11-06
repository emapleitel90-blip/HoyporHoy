import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { NativeSelect } from './ui/native-select';

export default function ThemeSelect() {
    const { theme, setTheme } = useTheme();
    const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
    return <div className="theme-select relative flex items-center">
        <Icon aria-hidden="true" size={15} className="pointer-events-none absolute left-3 text-muted-foreground" />
        <NativeSelect aria-label="Tema de la interfaz" value={theme} onChange={event => setTheme(event.target.value)} className="h-9 w-[110px] pl-9 pr-2 text-xs bg-card">
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="system">Sistema</option>
        </NativeSelect>
    </div>;
}
