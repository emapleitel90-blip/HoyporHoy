import { Button } from './ui/button';
import { Card } from './ui/card';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import {
    LayoutDashboard,
    Briefcase,
    Building2,
    LogOut,
    Menu,
    Settings,
    ChevronRight,
    BookOpen,
    CalendarCheck,
    Bell,
    X
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import ThemeSelect from './ThemeSelect';
import { Separator } from './ui/separator';

const Layout = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const menuButton = useRef(null);
    const closeButton = useRef(null);
    useEffect(() => {
        if (!isSidebarOpen) return;
        const trigger = menuButton.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeButton.current?.focus();
        return () => {
            document.body.style.overflow = previousOverflow;
            trigger?.focus();
        };
    }, [isSidebarOpen]);

    const navItems = [
        { name: 'Mi jornada', path: '/mi-jornada', icon: CalendarCheck },
        { name: 'Actividad y notificaciones', path: '/notifications', icon: Bell },
        { name: 'Resumen', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Gestión de Expedientes', path: '/cases', icon: Briefcase },
        { name: 'Ayuda / Manual', path: '/help', icon: BookOpen },
        { name: 'Configuración', path: '/settings', icon: Settings },
        ...(user?.role === 'SUPER_ADMIN' ? [{ name: 'SaaS Estudios', path: '/studios', icon: Building2 }] : []),
    ];

    return (
        <div className="app-shell min-h-screen flex font-sans text-foreground">
            {isSidebarOpen && <Button variant="legacy" size="legacy" aria-label="Cerrar navegación lateral" onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 lg:hidden" />}
            <a href="#page-content" className="skip-link">Ir al contenido</a>
            <aside
                id="main-navigation"
                onKeyDown={event => {
                    if (event.key === 'Escape') setIsSidebarOpen(false);
                    if (event.key === 'Tab' && isSidebarOpen) {
                        const controls = [...event.currentTarget.querySelectorAll('a, button')];
                        const first = controls[0];
                        const last = controls[controls.length - 1];
                        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                    }
                }}
                className={`app-sidebar fixed inset-y-0 left-0 z-50 w-72 shrink-0 lg:sticky lg:top-0 h-dvh bg-[#0F172A] text-white transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : 'hidden lg:block -translate-x-full'
                    } lg:translate-x-0 border-r border-border shadow-2xl`}
            >
                <div className="flex flex-col h-full overflow-y-auto">
                    <Button variant="legacy" size="legacy" ref={closeButton} aria-label="Cerrar menú" onClick={() => setIsSidebarOpen(false)} className="absolute right-3 top-3 p-2 lg:hidden"><X size={20} /></Button>
                    {/* Brand Logo */}
                    <div className="p-8">
                        <div className="flex items-center space-x-3 mb-2">
                            <Card className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group hover:bg-white/20 transition-all cursor-pointer">
                                <img src={logo} alt="LyP" className="w-7 h-7 object-contain" />
                            </Card>
                            <div>
                                <span className="text-xl font-black tracking-tighter text-white">LyP<span className="text-indigo-400">.</span></span>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Gestión Jurídica</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-6 space-y-1.5 mt-4">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-2">Tu espacio de trabajo</p>
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    aria-current={isActive ? 'page' : undefined}
                                    to={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    className={`flex items-center justify-between group px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <item.icon size={20} className={isActive ? 'text-white' : 'text-muted-foreground group-hover:text-white transition-colors'} />
                                        <span className="font-semibold text-sm">{item.name}</span>
                                    </div>
                                    {isActive && <ChevronRight size={14} className="text-white/50" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-6 mt-auto">
                        <Card className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-primary   flex items-center justify-center shadow-lg">
                                    <span className="text-sm font-bold text-white">{user?.name?.charAt(0)}</span>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold truncate text-white">{user?.name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate font-medium">{({ SUPER_ADMIN: 'Socio principal', ADMIN: 'Administrador', LAWYER: 'Abogado asociado', OPERATOR: 'Operador' })[user?.role] || 'Integrante del estudio'}</p>
                                </div>
                            </div>
                            <Button variant="legacy" size="legacy"
                                onClick={logout}
                                className="flex items-center justify-center space-x-2 w-full py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-bold"
                            >
                                <LogOut size={14} />
                                <span>Cerrar Sesión</span>
                            </Button>
                        </Card>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="bg-card/80 backdrop-blur-md sticky top-0 z-40 border-b border-border/60 h-20 flex items-center">
                    <div className="w-full min-w-0 flex items-center justify-between gap-3 px-4 sm:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <Button variant="legacy" size="legacy" ref={menuButton} aria-label="Abrir menú" aria-controls="main-navigation" aria-expanded={isSidebarOpen}
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-secondary-foreground p-2 hover:bg-muted rounded-lg transition-colors">
                                <Menu size={24} />
                            </Button>
                            <h1 className="text-base sm:text-xl font-bold text-foreground tracking-tight truncate">
                                {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'LyP'}
                            </h1>
                        </div>

                        <div className="flex items-center space-x-3">
                            <ThemeSelect />
                            <div className="hidden md:flex items-center bg-muted/50 rounded-xl px-3 py-1.5 border border-border/50">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Espacio de trabajo</span>
                            </div>
                            <Separator orientation="vertical" className="h-8 mx-2" />
                            <NotificationBell />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main id="page-content" tabIndex={-1} className="workspace flex-1 min-w-0 overflow-x-hidden w-full max-w-full p-4 sm:p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
