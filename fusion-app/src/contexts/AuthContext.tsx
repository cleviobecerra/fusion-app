import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database.types';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        // Timeout de seguridad
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                console.error('Supabase initialization timed out');
                setError('Tiempo de espera agotado al conectar con el servidor.');
                setLoading(false);
            }
        }, 30000);

        const applyLoad = () => {
            clearTimeout(timeoutId);
            if (isMounted) setLoading(false);
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!isMounted) return;

            console.log('AUTH EVENT:', event);

            // Si hay un error de token de refresco, el evento suele ser SIGNED_OUT 
            // pero podemos asegurar que el estado local se limpie.
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfile(null);
            } else {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    fetchProfile(currentSession.user.id);
                }
            }

            applyLoad();
        });

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.warn('Profile not found or error:', profileError);
                setProfile(null);
            } else {
                setProfile(data);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setProfile(null);
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            setLoading(true);

            await supabase.auth.signOut();
        } catch (err) {
            console.error('Error during signOut:', err);
        } finally {
            // Limpieza total (clave para evitar estados corruptos)
            localStorage.clear();
            sessionStorage.clear();

            setSession(null);
            setUser(null);
            setProfile(null);
            setError(null);
            setLoading(false);

            window.location.href = '/login';
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, error, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook personalizado
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};