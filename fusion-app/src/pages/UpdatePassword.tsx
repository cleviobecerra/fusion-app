import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function UpdatePassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [hasSession, setHasSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // 1. Verificamos si hay sesión en este momento
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) {
                if (session) {
                    setHasSession(true);
                }
                // Si aún no hay sesión, esperamos un rato a que onAuthStateChange intente recuperar el código PKCE
            }
        });

        // 2. Nos suscribimos a cualquier cambio de estado (eventos PASSWORD_RECOVERY o SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (isMounted) {
                if (session) {
                    setHasSession(true);
                    setCheckingSession(false);
                } else if (event === 'SIGNED_OUT') {
                    setHasSession(false);
                }
            }
        });

        // 3. Temporizador de seguridad: Si pasan 3 segundos y no tenemos sesión, mostramos el error
        const timeout = setTimeout(() => {
            if (isMounted) {
                setCheckingSession(false);
            }
        }, 3000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, [location]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!hasSession) {
            setError('Tu enlace es inválido o expiró. Por favor, solicita uno nuevo.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;
            
            setMessage('Contraseña actualizada correctamente. Redirigiendo...');
            
            // Redirect to home/dashboard after a brief delay
            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err: any) {
            console.error("Error al actualizar contraseña:", err);
            setError(err.message || 'Error al actualizar la contraseña');
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
                    <h1 className="mt-6 text-2xl font-bold tracking-tight">Crea una nueva contraseña</h1>
                    <p className="text-muted mt-2">Ingresa tu nueva contraseña para Fusion App</p>
                </div>

                <div className="card p-8 shadow-lg">
                    {checkingSession ? (
                        <div className="flex justify-center items-center py-4">
                            <span className="text-muted text-sm">Verificando enlace seguro...</span>
                        </div>
                    ) : !hasSession ? (
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                                <AlertCircle size={16} />
                                <span>El enlace es inválido o caducó.</span>
                            </div>
                            <button
                                onClick={() => navigate('/login')}
                                className="btn btn-outline text-sm w-full"
                            >
                                Volver al inicio de sesión
                            </button>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="flex items-center gap-2 p-3 mb-6 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-in fade-in zoom-in-95 duration-200">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}
                            {message && (
                                <div className="flex items-center gap-2 p-3 mb-6 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm animate-in fade-in zoom-in-95 duration-200">
                                    <CheckCircle2 size={16} />
                                    <span>{message}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdate} className="space-y-5">
                                <div>
                                    <label className="form-label" htmlFor="password">Nueva Contraseña</label>
                                    <input
                                        id="password"
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div>
                                    <label className="form-label" htmlFor="confirmPassword">Confirmar Contraseña</label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                
                                <button
                                    type="submit"
                                    className="btn btn-primary w-full py-2.5 mt-2 transition-all duration-200"
                                    disabled={loading || !!message}
                                >
                                    {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-muted mt-8">
                    &copy; 2026 Fusion App. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}

