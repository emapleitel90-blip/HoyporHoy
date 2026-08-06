import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Credenciales inválidas. Verifique su email y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 font-sans">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/20 blur-[150px] mix-blend-screen" style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></div>
            
            <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center z-10 p-6 lg:p-12 gap-12 lg:gap-24">
                
                {/* Left Side - Branding (Premium) */}
                <div className="w-full lg:w-1/2 text-white space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full backdrop-blur-md">
                        <img src={logo} alt="LyP" className="w-8 h-8 object-contain" />
                        <span className="font-semibold text-sm tracking-widest uppercase text-slate-300">LyP Gestión Premium</span>
                    </div>
                    
                    <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight">
                        Eleva la <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Práctica Legal</span>
                    </h1>
                    
                    <p className="text-lg text-slate-400 leading-relaxed max-w-lg">
                        El ecosistema definitivo para la gestión integral de tu estudio jurídico. Diseñado para maximizar la eficiencia y el control de expedientes.
                    </p>

                    <div className="grid grid-cols-2 gap-6 pt-6">
                        <div className="border-l-2 border-indigo-500 pl-4">
                            <h3 className="text-2xl font-bold text-white mb-1">On-Premise</h3>
                            <p className="text-sm text-slate-400">Privacidad absoluta de tus datos.</p>
                        </div>
                        <div className="border-l-2 border-cyan-500 pl-4">
                            <h3 className="text-2xl font-bold text-white mb-1">Eficiencia</h3>
                            <p className="text-sm text-slate-400">Flujos de trabajo optimizados.</p>
                        </div>
                    </div>
                </div>

                {/* Right Side - Glassmorphism Form */}
                <div className="w-full lg:w-[480px] animate-in fade-in slide-in-from-right-8 duration-1000 delay-150">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 lg:p-12 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative overflow-hidden">
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-50"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Bienvenido de nuevo</h2>
                            <p className="text-slate-400 text-sm mb-8">Ingresa tus credenciales para acceder al sistema.</p>

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl flex items-center text-sm gap-3 backdrop-blur-md animate-in slide-in-from-top-2">
                                    <span className="flex-shrink-0">⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-300">Correo Electrónico</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            className="block w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 transition-all outline-none"
                                            placeholder="nombre@estudio.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-slate-300">Contraseña</label>
                                        <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                                            ¿Olvidaste tu contraseña?
                                        </a>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            className="block w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 transition-all outline-none"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-between items-center py-4 px-6 mt-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
                                >
                                    <span>{loading ? 'Ingresando...' : 'Acceder al Sistema'}</span>
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
