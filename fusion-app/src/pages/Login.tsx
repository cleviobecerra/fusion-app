import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [view, setView] = useState<'sign-in' | 'forgot-password'>('sign-in');

    // Redirect if already logged in
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (view === 'sign-in') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) throw error;
                setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
            }
        } catch (err: any) {
            setError(err.message || (view === 'sign-in' ? 'Error al iniciar sesión' : 'Error al solicitar recuperación'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center px-6" style={{ minHeight: '100vh', backgroundColor: 'var(--color-background)' }}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <div
                        className="bg-primary rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-primary/20 flex-shrink-0"
                        style={{ width: '48px', height: '48px' }}
                    >
                        F
                    </div>
                    <h1 className="mt-6 text-2xl font-bold tracking-tight">
                        {view === 'sign-in' ? 'Bienvenido de nuevo' : 'Recuperar Contraseña'}
                    </h1>
                    <p className="text-muted mt-2">
                        {view === 'sign-in' ? 'Ingresa a tu cuenta de Fusion App' : 'Te enviaremos un enlace para restaurar tu acceso'}
                    </p>
                </div>

                <div className="card p-8 shadow-lg">
                    {error && (
                        <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-in fade-in zoom-in-95 duration-200">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                    {message && (
                        <div className="flex items-center gap-2 p-3 mb-6 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm animate-in fade-in zoom-in-95 duration-200">
                            <AlertCircle size={16} />
                            <span>{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="form-label" htmlFor="email">Correo Electrónico</label>
                            <input
                                id="email"
                                type="email"
                                className="form-input"
                                placeholder="tu@correo.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {view === 'sign-in' && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="form-label" htmlFor="password">Contraseña</label>
                                    <button
                                        type="button"
                                        onClick={() => { setView('forgot-password'); setError(null); setMessage(null); }}
                                        className="text-xs text-primary font-medium hover:underline bg-transparent border-0 cursor-pointer"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full py-2.5 mt-2 transition-all duration-200"
                            disabled={loading}
                        >
                            {loading
                                ? 'Espera un momento...'
                                : view === 'sign-in'
                                    ? 'Iniciar Sesión'
                                    : 'Enviar Enlace'
                            }
                        </button>

                        {view === 'forgot-password' && (
                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setView('sign-in'); setError(null); setMessage(null); }}
                                    className="text-sm text-muted hover:text-primary transition-colors bg-transparent border-0 cursor-pointer font-medium"
                                >
                                    Volver a Iniciar Sesión
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                <p className="text-center text-xs text-muted mt-8">
                    &copy; 2026 Fusion App. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
