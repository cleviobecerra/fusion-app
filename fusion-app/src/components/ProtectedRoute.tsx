import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types/database.types';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { user, profile, loading, error } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center" style={{ height: '100vh', flexDirection: 'column' }}>
                <p>Cargando aplicación...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center" style={{ height: '100vh', padding: '2rem', backgroundColor: '#fdf2f2' }}>
                <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                    <h2 style={{ color: '#b91c1c', marginBottom: '1rem' }}>Error de Inicialización</h2>
                    <p style={{ color: '#7f1d1d', marginBottom: '2rem' }}>{error}</p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="btn btn-primary"
                            style={{ backgroundColor: '#b91c1c', borderColor: '#b91c1c', width: '100%' }}
                        >
                            Reintentar
                        </button>
                        <button 
                            onClick={() => useAuth().signOut()} 
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Cerrar Sesión (Limpiar datos)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If specific roles are required and profile is loaded
    if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        // User doesn't have permission for this route
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
