import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Upload as UploadIcon, Users, List, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
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
            <aside style={{
                position: 'sticky',
                top: 0,
                height: '100vh',
                width: collapsed ? '64px' : '260px',
                minWidth: collapsed ? '64px' : '260px',
                transition: 'width 240ms ease, min-width 240ms ease',
                overflow: 'visible',          /* allow toggle btn to bleed outside */
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--color-sidebar)',
                borderRight: '1px solid var(--color-border)',
                zIndex: 50,
            }}>

                {/* ── Toggle button – floating on the right border ── */}
                <button
                    onClick={() => setSidebarOpen(v => !v)}
                    title={collapsed ? 'Abrir panel' : 'Cerrar panel'}
                    style={{
                        position: 'absolute',
                        top: '72px',
                        right: '-13px',
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: '1px solid var(--color-border)',
                        background: '#fff',
                        boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-neutral-500)',
                        zIndex: 60,
                        transition: 'background 150ms, color 150ms, border-color 150ms',
                    }}
                    onMouseEnter={e => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.background = 'var(--color-primary)';
                        b.style.color = '#fff';
                        b.style.borderColor = 'var(--color-primary)';
                    }}
                    onMouseLeave={e => {
                        const b = e.currentTarget as HTMLButtonElement;
                        b.style.background = '#fff';
                        b.style.color = 'var(--color-neutral-500)';
                        b.style.borderColor = 'var(--color-border)';
                    }}
                >
                    {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>

                {/* ── Logo row ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: collapsed ? '1.5rem 0' : '1.5rem 1.25rem',
                    marginTop: '0.75rem',
                    borderBottom: '1px solid var(--color-border)',
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
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                            Fusion App
                        </span>
                    )}
                </div>

                {/* ── Nav ── */}
                <nav style={{ flex: 1, padding: '1rem 0.625rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {!isDriver && (
                        <>
                            <button
                                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                                onClick={() => setActiveTab('orders')}
                                title={collapsed ? 'Gestión Logística' : undefined}
                                style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '0.625rem' : undefined }}
                            >
                                <List size={18} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>Gestión Logística</span>}
                            </button>

                            <button
                                className={`nav-item ${activeTab === 'upload' ? 'active' : ''}`}
                                onClick={() => setActiveTab('upload')}
                                title={collapsed ? 'Subir Archivos' : undefined}
                                style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '0.625rem' : undefined }}
                            >
                                <UploadIcon size={18} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>Subir Archivos</span>}
                            </button>
                        </>
                    )}

                    {isDriver && (
                        <button
                            className={`nav-item ${activeTab === 'driver' ? 'active' : ''}`}
                            onClick={() => setActiveTab('driver')}
                            title={collapsed ? 'Mis Entregas' : undefined}
                            style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '0.625rem' : undefined }}
                        >
                            <Truck size={18} style={{ flexShrink: 0 }} />
                            {!collapsed && <span>Mis Entregas</span>}
                        </button>
                    )}

                    {isAdmin && (
                        <button
                            className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                            onClick={() => setActiveTab('admin')}
                            title={collapsed ? 'Administración' : undefined}
                            style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '0.625rem' : undefined }}
                        >
                            <Users size={18} style={{ flexShrink: 0 }} />
                            {!collapsed && <span>Administración</span>}
                        </button>
                    )}
                </nav>

                {/* ── Profile (only when expanded) ── */}
                {!collapsed && (
                    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0 0.5rem' }}>
                            {profile?.full_name || 'Usuario'}
                        </span>
                    </div>
                )}

                {/* ── Logout ── */}
                <div style={{ padding: '0.5rem 0.625rem 1rem' }}>
                    <button
                        onClick={signOut}
                        title={collapsed ? 'Cerrar Sesión' : undefined}
                        className="nav-item"
                        style={{
                            justifyContent: collapsed ? 'center' : undefined,
                            padding: collapsed ? '0.625rem' : undefined,
                            color: 'var(--color-danger)',
                        }}
                    >
                        <LogOut size={18} style={{ flexShrink: 0, color: 'var(--color-danger)' }} />
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
                            {activeTab === 'upload' && <FileUpload onUploadSuccess={handleUploadSuccess} />}
                            {activeTab === 'orders' && <OrderList refreshTrigger={refreshOrders} />}
                            {activeTab === 'admin' && isAdmin && <AdminPanel />}
                            {activeTab === 'driver' && isDriver && <DriverDashboard />}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
