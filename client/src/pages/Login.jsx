import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ChevronRight } from 'lucide-react';
import logo from '../assets/logo.png';
import ThemeSelect from '../components/ThemeSelect';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(useGSAP);

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const scope = useRef(null);
    useGSAP(() => {
        if (typeof window.matchMedia !== 'function') return;
        const media = gsap.matchMedia();
        media.add('(prefers-reduced-motion: no-preference)', () => {
            gsap.from('.login-copy > *', { y: 18, opacity: 0, stagger: 0.09, duration: 0.7, ease: 'power2.out' });
            gsap.from('.login-form', { scale: 0.97, opacity: 0, duration: 0.65, ease: 'power2.out' });
        });
        return () => media.revert();
    }, { scope });

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
        <div ref={scope} className="login-screen min-h-screen flex items-center justify-center relative overflow-hidden bg-primary font-sans">
            <div className="login-theme absolute right-4 top-4 z-20"><ThemeSelect /></div>

            <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center z-10 p-6 lg:p-12 gap-12 lg:gap-24">

                <div className="login-copy w-full lg:w-1/2 text-white space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <Card className="inline-flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full backdrop-blur-md">
                        <img src={logo} alt="LyP" className="w-8 h-8 object-contain" />
                        <span className="font-semibold text-sm tracking-widest uppercase text-muted-foreground">Lamberti & Pleitel</span>
                    </Card>

                    <h1 className="max-w-5xl text-[clamp(2.6rem,4.5vw,4.5rem)] font-semibold leading-[1.08] tracking-tight">
                        Tu estudio.<br/>
                        <span>Todo en orden.</span>
                    </h1>

                    <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                        Expedientes, vencimientos y tareas en un mismo lugar. Más claridad para organizar tu jornada y acompañar cada caso.
                    </p>

                    <p className="login-note">Gestión jurídica · Lamberti & Pleitel</p>
                </div>

                <div className="login-form w-full lg:w-[480px] lg:shrink-0 animate-in fade-in slide-in-from-right-8 duration-1000 delay-150">
                    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-8 lg:p-12 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative overflow-hidden">


                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Bienvenido de nuevo</h2>
                            <p className="text-muted-foreground text-sm mb-8">Ingresa tus credenciales para acceder al sistema.</p>

                            {error && (
                                <div role="alert" className="mb-6 p-4 bg-red-500/20 border border-red-500/50 text-red-200 rounded-xl flex items-center text-sm gap-3 backdrop-blur-md animate-in slide-in-from-top-2">

                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <Label htmlFor="login-email" className="block text-sm font-medium text-muted-foreground">Correo electrónico</Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                                        </div>
                                        <Input
                                            id="login-email" autoComplete="username" type="email"
                                            required
                                            className="block w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent text-white placeholder-muted-foreground transition-all outline-none"
                                            placeholder="nombre@estudio.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="login-password" className="block text-sm font-medium text-muted-foreground">Contraseña</Label>

                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-indigo-400 transition-colors" />
                                        </div>
                                        <Input
                                            id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'}
                                            required
                                            className="block w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-ring focus:border-transparent text-white placeholder-muted-foreground transition-all outline-none"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <Button variant="legacy" size="legacy"
                                            type="button"
                                            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                </div>

                                <Button size="lg"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-between items-center h-12 px-6 mt-4 font-semibold group"
                                >
                                    <span>{loading ? 'Ingresando...' : 'Acceder al Sistema'}</span>
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    )}
                                </Button>
                            </form>
                            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">Si necesitás recuperar el acceso, contactá a la administración de tu estudio.</p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Login;
