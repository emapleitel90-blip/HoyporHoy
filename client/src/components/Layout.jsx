import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';
import {
    LayoutDashboard,
    Briefcase,
    Building2,
    LogOut,
    Menu,
    X,
    User,
    Settings,
    ChevronRight,
    Bell,
    BookOpen,
    CalendarCheck
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';

const Layout = () => {
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    const navItems = [
        { name: 'Mi jornada', path: '/mi-jornada', icon: CalendarCheck },
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Gestión de Expedientes', path: '/cases', icon: Briefcase },
        { name: 'Ayuda / Manual', path: '/help', icon: BookOpen },
        { name: 'Configuración', path: '/settings', icon: Settings },
        ...(user?.role === 'SUPER_ADMIN' ? [{ name: 'SaaS Estudios', path: '/studios', icon: Building2 }] : []),
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-white transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:relative lg:translate-x-0 border-r border-slate-800 shadow-2xl`}
            >
                <div className="flex flex-col h-full">
                    {/* Brand Logo */}
                    <div className="p-8">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 group hover:bg-white/20 transition-all cursor-pointer">
                                <img src={logo} alt="LyP" className="w-7 h-7 object-contain" />
                            </div>
                            <div>
                                <span className="text-xl font-black tracking-tighter text-white">LyP<span className="text-indigo-400">.</span></span>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Gestión Jurídica</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-6 space-y-1.5 mt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Menú Principal</p>
                        {navItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center justify-between group px-4 py-3.5 rounded-xl transition-all duration-200 ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <item.icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'} />
                                        <span className="font-semibold text-sm">{item.name}</span>
                                    </div>
                                    {isActive && <ChevronRight size={14} className="text-white/50" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-6 mt-auto">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <span className="text-sm font-bold text-white">{user?.name?.charAt(0)}</span>
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold truncate text-white">{user?.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate font-medium">{user?.role === 'SUPER_ADMIN' ? 'Socio Principal' : 'Abogado Asociado'}</p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center justify-center space-x-2 w-full py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all duration-200 text-xs font-bold"
                            >
                                <LogOut size={14} />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Topbar */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/60 h-20 flex items-center">
                    <div className="w-full flex items-center justify-between px-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                <Menu size={24} />
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                                {navItems.find(i => location.pathname.startsWith(i.path))?.name || 'LyP'}
                            </h1>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <div className="hidden md:flex items-center bg-slate-100/50 rounded-xl px-3 py-1.5 border border-slate-200/50">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sistema Operativo</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 mx-2"></div>
                            <NotificationBell />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-8 lg:p-10">
                    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
