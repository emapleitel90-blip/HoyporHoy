import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { api } from '../config/api';

export default function AccountAccess() {
    const { hash } = useLocation();
    const token = new URLSearchParams(hash.slice(1)).get('token') || '';
    const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    async function submit(event) {
        event.preventDefault();
        if (busy || !validToken) return;
        setError('');
        if (password !== confirmation) {
            setError('Las contraseñas deben coincidir.');
            return;
        }
        setBusy(true);
        try {
            const response = await fetch(api.auth.redeemAccountLink, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
                referrerPolicy: 'no-referrer',
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'No pudimos guardar la contraseña.');
                return;
            }
            setPassword('');
            setConfirmation('');
            setDone(true);
        } catch {
            setError('No pudimos conectar con el servidor. Volvé a intentar.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-8">
            <Card className="w-full space-y-5 p-7">
                <h1 className="text-2xl font-bold">Elegí tu contraseña de HoyporHoy</h1>
                {done ? (
                    <p role="status">Contraseña guardada. Ya podés iniciar sesión.</p>
                ) : validToken ? (
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-account-password">Nueva contraseña</Label>
                            <Input id="new-account-password" type="password" required minLength={12}
                                autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} />
                            <p className="text-sm text-muted-foreground">Usá al menos 12 caracteres.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-account-password">Repetí la contraseña</Label>
                            <Input id="confirm-account-password" type="password" required minLength={12}
                                autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} />
                        </div>
                        {error && <p role="alert" className="text-destructive">{error}</p>}
                        <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</Button>
                    </form>
                ) : (
                    <p role="alert">El enlace está incompleto. Pedí uno nuevo a la administración.</p>
                )}
                <Link to="/login" replace className="inline-block text-sm font-semibold text-link underline">Ir al inicio de sesión</Link>
            </Card>
        </main>
    );
}
