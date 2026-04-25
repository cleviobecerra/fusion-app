import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Upload as UploadIcon, Users, List, Truck, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { AdminPanel } from '../components/AdminPanel';
import { OrderList } from '../components/OrderList';
import { DriverDashboard } from '../components/DriverDashboard';
import { Reports } from '../components/Reports';

export function Dashboard() {
    const { profile, signOut } = useAuth();
    const isAdmin = profile?.role === 'ADMIN';
    const isDriver = profile?.role === 'DRIVER';

    const [activeTab, setActiveTab] = useState<'orders' | 'upload' | 'admin' | 'driver' | 'reports'>('orders');
    const [refreshOrders, setRefreshOrders] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (isDriver) setActiveTab('driver');
    }, [isDriver]);

    const handleUploadSuccess = () => {
        setActiveTab('orders');
        setRefreshOrders(prev => prev + 1);
    };

    const collapsed = !sidebarOpen;

    return (
        <div className="app-shell">

            {/* ── Sidebar ── */}
            <aside className="sidebar-container" style={{
                width: collapsed ? '72px' : '260px',
                minWidth: collapsed ? '72px' : '260px',
            }}>

                {/* ── Toggle button – floating on the right border ── */}
                <button
                    onClick={() => setSidebarOpen(v => !v)}
                    title={collapsed ? 'Abrir panel' : 'Cerrar panel'}
                    className="sidebar-toggle-btn"
                >
                    {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                {/* ── Logo row ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: collapsed ? '1.5rem 0' : '1.5rem 1.25rem',
                    marginTop: '0.5rem',
                    borderBottom: '1px solid var(--color-sidebar-border)',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    overflow: 'hidden',
                }}>
                    {/* Logo square – always visible */}
                    <div style={{
                        width: '34px',
                        height: '34px',
                        minWidth: '34px',
                        background: 'linear-gradient(135deg, #3ecf8e 0%, #2eb875 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 3px 8px rgba(62,207,142,0.35)',
                        flexShrink: 0,
                    }}>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px', lineHeight: 1 }}>F</span>
                    </div>

                    {!collapsed && (
                        <span className="sidebar-logo-text">
                            Fusion App
                        </span>
                    )}
                </div>

                {/* ── Nav ── */}
                <nav className="sidebar-nav">
                    {!isDriver && (
                        <>
                            <button
                                className={`nav-item ${activeTab === 'orders' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                                onClick={() => setActiveTab('orders')}
                                title={collapsed ? 'Gestión Logística' : undefined}
                            >
                                <List size={20} />
                                {!collapsed && <span>Gestión Logística</span>}
                            </button>

                            <button
                                className={`nav-item ${activeTab === 'upload' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                                onClick={() => setActiveTab('upload')}
                                title={collapsed ? 'Subir Archivos' : undefined}
                            >
                                <UploadIcon size={20} />
                                {!collapsed && <span>Subir Archivos</span>}
                            </button>
                        </>
                    )}

                    {isDriver && (
                        <button
                            className={`nav-item ${activeTab === 'driver' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                            onClick={() => setActiveTab('driver')}
                            title={collapsed ? 'Mis Entregas' : undefined}
                        >
                            <Truck size={20} />
                            {!collapsed && <span>Mis Entregas</span>}
                        </button>
                    )}

                    {isAdmin && (
                        <>
                            <button
                                className={`nav-item ${activeTab === 'reports' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                                onClick={() => setActiveTab('reports')}
                                title={collapsed ? 'Reportes' : undefined}
                            >
                                <BarChart3 size={20} />
                                {!collapsed && <span>Reportes</span>}
                            </button>

                            <button
                                className={`nav-item ${activeTab === 'admin' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                                onClick={() => setActiveTab('admin')}
                                title={collapsed ? 'Administración' : undefined}
                            >
                                <Users size={20} />
                                {!collapsed && <span>Administración</span>}
                            </button>
                        </>
                    )}
                </nav>

                {/* ── Profile (only when expanded) ── */}
                {!collapsed && (
                    <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--color-sidebar-border)' }}>
                        <span className="sidebar-profile-text" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            {profile?.full_name || 'Usuario'}
                        </span>
                    </div>
                )}

                {/* ── Logout ── */}
                <div style={{ padding: '0.5rem 0 1rem' }}>
                    <button
                        onClick={signOut}
                        title={collapsed ? 'Cerrar Sesión' : undefined}
                        className={`nav-item ${collapsed ? 'collapsed' : ''}`}
                        style={{ color: 'var(--color-danger)' }}
                    >
                        <LogOut size={20} style={{ color: 'var(--color-danger)', opacity: 1 }} />
                        {!collapsed && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* ── Main Layout ── */}
            <div className="main-layout">
                <header className="top-header">
                    <div className="flex items-center gap-2 text-sm text-muted">
                        <span>Dashboard</span>
                        <span style={{ color: 'var(--color-neutral-300)' }}>/</span>
                        <span style={{ fontWeight: 500, color: 'var(--color-neutral-900)' }}>
                            {activeTab === 'orders' && 'Gestión Logística'}
                            {activeTab === 'upload' && 'Subir Archivos'}
                            {activeTab === 'admin' && 'Administración'}
                            {activeTab === 'driver' && 'Mis Entregas'}
                            {activeTab === 'reports' && 'Reportes'}
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
                        {activeTab !== 'admin' && (
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold">
                                    {activeTab === 'orders' && 'Panel Logístico'}
                                    {activeTab === 'upload' && 'Carga de Datos'}
                                    {activeTab === 'admin' && 'Panel de Administración'}
                                    {activeTab === 'driver' && 'Portal del Chofer'}
                                    {activeTab === 'reports' && 'Reportes y Analítica'}
                                </h1>
                                <p className="text-muted mt-2">
                                    {activeTab === 'orders' && 'Gestiona los estados de entrega y stock en tiempo real.'}
                                    {activeTab === 'upload' && 'Sube archivos Excel o CSV para actualizar el sistema.'}
                                    {activeTab === 'admin' && 'Administra usuarios, choferes y configuraciones globales.'}
                                    {activeTab === 'driver' && 'Visualiza y gestiona tus rutas de entrega asignadas.'}
                                    {activeTab === 'reports' && 'Consulta el rendimiento de ventas, sacos y logística.'}
                                </p>
                            </div>
                        )}

                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'upload' && <FileUpload onUploadSuccess={handleUploadSuccess} />}
                            {activeTab === 'orders' && <OrderList refreshTrigger={refreshOrders} />}
                            {activeTab === 'admin' && isAdmin && <AdminPanel />}
                            {activeTab === 'reports' && isAdmin && <Reports />}
                            {activeTab === 'driver' && isDriver && <DriverDashboard />}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
