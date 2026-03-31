import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Upload as UploadIcon, Users, List, Truck } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { AdminPanel } from '../components/AdminPanel';
import { OrderList } from '../components/OrderList';
import { DriverDashboard } from '../components/DriverDashboard';

export function Dashboard() {
    const { profile, signOut } = useAuth();
    const isAdmin = profile?.role === 'ADMIN';
    const isDriver = profile?.role === 'DRIVER';

    const [activeTab, setActiveTab] = useState<'orders' | 'upload' | 'admin' | 'driver'>('orders');
    const [refreshOrders, setRefreshOrders] = useState(0);

    // Default to driver view if role is DRIVER
    useEffect(() => {
        if (isDriver) {
            setActiveTab('driver');
        } else if (isAdmin) {
            // Keep orders as default for Admin
        }
    }, [isDriver, isAdmin]);

    const handleUploadSuccess = () => {
        setActiveTab('orders');
        setRefreshOrders(prev => prev + 1);
    };

    return (
        <div className="app-shell">
            {/* Sidebar Global */}
            <aside className="sidebar-global">
                <div className="flex items-center gap-3 px-6 py-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">F</div>
                    <h2 className="text-xl font-bold tracking-tight m-0">Fusion App</h2>
                </div>

                <nav className="sidebar-nav">
                    {!isDriver && (
                        <>
                            <button
                                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                                onClick={() => setActiveTab('orders')}
                            >
                                <List size={18} />
                                <span>Gestión Logística</span>
                            </button>
                            <button
                                className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
                                onClick={() => setActiveTab('upload')}
                            >
                                <UploadIcon size={18} />
                                <span>Subir Archivos</span>
                            </button>
                        </>
                    )}

                    {isDriver && (
                        <button
                            className={`nav-item ${activeTab === 'driver' ? 'active' : ''}`}
                            onClick={() => setActiveTab('driver')}
                        >
                            <Truck size={18} />
                            <span>Mis Entregas</span>
                        </button>
                    )}

                    {isAdmin && (
                        <button
                            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                            onClick={() => setActiveTab('admin')}
                        >
                            <Users size={18} />
                            <span>Administración</span>
                        </button>
                    )}
                </nav>

                <div className="mt-auto p-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold truncate">{profile?.full_name || 'Usuario'}</span>
                            <span className="text-xs text-muted truncate uppercase">{profile?.role}</span>
                        </div>
                    </div>
                    <button onClick={signOut} className="nav-item text-danger hover:bg-red-50 hover:text-red-600">
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Layout Area */}
            <div className="main-layout">
                <header className="top-header">
                    <div className="flex items-center gap-2 text-sm text-muted">
                        <span>Dashboard</span>
                        <span className="text-neutral-300">/</span>
                        <span className="font-medium text-neutral-900 capitalize">
                            {activeTab === 'orders' && 'Gestión Logística'}
                            {activeTab === 'upload' && 'Subir Archivos'}
                            {activeTab === 'admin' && 'Administración'}
                            {activeTab === 'driver' && 'Mis Entregas'}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-neutral'}`}>
                            {profile?.role}
                        </span>
                    </div>
                </header>

                <main className="content-wrapper">
                    <div className="container-centered">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold">
                                {activeTab === 'orders' && 'Panel Logístico'}
                                {activeTab === 'upload' && 'Carga de Datos'}
                                {activeTab === 'admin' && 'Panel de Administración'}
                                {activeTab === 'driver' && 'Portal del Chofer'}
                            </h1>
                            <p className="text-muted mt-2">
                                {activeTab === 'orders' && 'Gestiona los estados de entrega y stock en tiempo real.'}
                                {activeTab === 'upload' && 'Sube archivos Excel o CSV para actualizar el sistema.'}
                                {activeTab === 'admin' && 'Administra usuarios, choferes y configuraciones globales.'}
                                {activeTab === 'driver' && 'Visualiza y gestiona tus rutas de entrega asignadas.'}
                            </p>
                        </div>

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'upload' && (
                                <FileUpload onUploadSuccess={handleUploadSuccess} />
                            )}

                            {activeTab === 'orders' && (
                                <OrderList refreshTrigger={refreshOrders} />
                            )}

                            {activeTab === 'admin' && isAdmin && (
                                <AdminPanel />
                            )}

                            {activeTab === 'driver' && isDriver && (
                                <DriverDashboard />
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
