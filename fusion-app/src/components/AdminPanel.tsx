import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, Driver, UserRole } from '../types/database.types';
import { Shield, UserPlus, Truck, Eye, EyeOff, List, Key, Trash2 } from 'lucide-react';

export function AdminPanel() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);

    // New Driver state
    const [newDriverName, setNewDriverName] = useState('');
    const [newDriverPhone, setNewDriverPhone] = useState('');
    const [newDriverRut, setNewDriverRut] = useState('');

    // New User state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserFullName, setNewUserFullName] = useState('');
    const [newUserRole, setNewUserRole] = useState<UserRole>('USER');
    const [newUserRutEmpresa, setNewUserRutEmpresa] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);

    // Reset password state
    const [resetUserId, setResetUserId] = useState<{id: string, name: string} | null>(null);
    const [resetPasswordText, setResetPasswordText] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);

    // Settings state
    const [sacksPerPallet, setSacksPerPallet] = useState<number>(56);
    const [savingSettings, setSavingSettings] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, driversRes] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('drivers').select('*').order('name', { ascending: true })
            ]);

            if (profilesRes.data) setProfiles(profilesRes.data);
            if (driversRes.data) setDrivers(driversRes.data);

            // Fetch settings
            const { data: settingsData } = await supabase
                .from('app_settings')
                .select('*')
                .eq('key', 'sacks_per_pallet')
                .single();

            if (settingsData) {
                setSacksPerPallet(Number(settingsData.value));
            }
        } catch (error: any) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async () => {
        setSavingSettings(true);
        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({ key: 'sacks_per_pallet', value: sacksPerPallet });

            if (error) throw error;
            alert('Configuración guardada correctamente.');
        } catch (err: any) {
            alert('Error al guardar configuración: ' + err.message);
        } finally {
            setSavingSettings(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const assignRole = async (userId: string, newRole: UserRole) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (!error) {
            setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
        } else {
            alert('Error updating role: ' + error.message);
        }
    };

    const linkDriver = async (userId: string, driverId: string | null) => {
        const { error } = await supabase
            .from('profiles')
            .update({ driver_id: driverId === '' ? null : driverId })
            .eq('id', userId);

        if (!error) {
            setProfiles(profiles.map(p => p.id === userId ? { ...p, driver_id: driverId === '' ? null : driverId } : p));
        } else {
            alert('Error vinculando chofer: ' + error.message);
        }
    };

    const addDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDriverName) return;

        const { data, error } = await supabase
            .from('drivers')
            .insert([{ name: newDriverName, phone: newDriverPhone, rut: newDriverRut }])
            .select();

        if (!error && data) {
            setDrivers([...drivers, data[0]]);
            setNewDriverName('');
            setNewDriverPhone('');
            setNewDriverRut('');
        } else {
            alert('Error adding driver: ' + error?.message);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newUserEmail || !newUserPassword || !newUserFullName) return;

        setCreatingUser(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error('No estás autenticado');

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/create_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                    email: newUserEmail,
                    password: newUserPassword,
                    full_name: newUserFullName,
                    role: newUserRole,
                    rut_empresa: newUserRutEmpresa // <-- Enviamos el RUT directamente
                })
            });

            // 🔥 Manejo seguro de respuesta
            let resData: any = null;

            try {
                resData = await response.json();
            } catch {
                const text = await response.text();
                throw new Error(`Error servidor (${response.status}): ${text}`);
            }

            if (!response.ok) {
                throw new Error(resData?.error || `Error HTTP ${response.status}`);
            }

            // Ya no necesitamos la lógica manual de actualización aquí, 
            // el trigger de la base de datos se encarga de todo.

            // Refresh
            await fetchData();

            // Reset form
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserFullName('');
            setNewUserRole('USER');
            setNewUserRutEmpresa('');

            alert('Usuario creado exitosamente');

        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error inesperado');
        } finally {
            setCreatingUser(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar a ${userName}? Esta acción no se puede deshacer.`)) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No estás autenticado');

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/delete_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({ target_user_id: userId })
            });

            if (!response.ok) {
                const resData = await response.json().catch(() => ({}));
                throw new Error(resData.error || 'Error al eliminar usuario');
            }

            alert('Usuario eliminado correctamente');
            await fetchData();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Error al eliminar usuario');
        }
    };

    const handleResetPassword = async () => {
        if (!resetUserId || resetPasswordText.length < 6) return;
        setIsResetting(true);
        setResetError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No estás autenticado');

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const response = await fetch(`${supabaseUrl}/functions/v1/reset_password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'apikey': supabaseAnonKey
                },
                body: JSON.stringify({
                    target_user_id: resetUserId.id,
                    new_password: resetPasswordText
                })
            });

            const resData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(resData.error || 'Error HTTP al reiniciar contraseña');
            }

            alert(`Contraseña de ${resetUserId.name} actualizada correctamente`);
            setResetUserId(null);
            setResetPasswordText('');
        } catch (err: any) {
            console.error(err);
            setResetError(err.message || 'Error inesperado');
        } finally {
            setIsResetting(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'users' | 'drivers' | 'settings'>('users');

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="text-center">
                <div className="spinner mb-4"></div>
                <p className="text-muted">Cargando panel de administración...</p>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="card">
                <div className="card-header border-b">
                    <h3 className="flex items-center gap-2">
                        <UserPlus size={18} className="text-primary" />
                        Agregar Nuevo Empleado
                    </h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="form-label">Email Corporativo</label>
                            <input className="form-input" type="email" placeholder="ejemplo@fusion.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Contraseña</label>
                            <div className="relative">
                                <input
                                    className="form-input pr-10"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Mínimo 6 caracteres"
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary transition-colors bg-transparent border-0 cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="form-label">Nombre Completo</label>
                            <input className="form-input" placeholder="Nombre y Apellido" value={newUserFullName} onChange={e => setNewUserFullName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Rol del Sistema</label>
                            <select className="form-input" value={newUserRole} onChange={e => setNewUserRole(e.target.value as UserRole)}>
                                <option value="USER">Usuario Estándar</option>
                                <option value="ADMIN">Administrador</option>
                                <option value="DRIVER">Chofer Autorizado</option>
                            </select>
                        </div>
                        {newUserRole === 'DRIVER' && (
                            <div>
                                <label className="form-label">RUT Empresa</label>
                                <input className="form-input" placeholder="Ej: 76.123.456-7" value={newUserRutEmpresa} onChange={e => setNewUserRutEmpresa(e.target.value)} required />
                            </div>
                        )}
                        <div className="md:col-span-2 pt-6">
                            <button className="btn btn-primary px-8" type="submit" disabled={creatingUser}>
                                {creatingUser ? 'Creando...' : 'Crear Usuario'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header border-b">
                    <h3 className="flex items-center gap-2">
                        <Shield size={18} className="text-primary" />
                        Lista de Usuarios y Permisos
                    </h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Rol & RUT</th>
                                <th>Vínculo Chofer</th>
                                <th className="text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profiles.map(p => (
                                <tr key={p.id}>
                                    <td className="font-medium">{p.full_name || 'Sin Nombre'}</td>
                                    <td>
                                        <span className={`badge ${p.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                                            {p.role}
                                        </span>
                                        {p.role === 'DRIVER' && p.rut_empresa && (
                                            <div className="text-[11px] text-muted font-medium mt-1">RUT: {p.rut_empresa}</div>
                                        )}
                                    </td>
                                    <td>
                                        {p.role === 'DRIVER' ? (
                                            <select
                                                className="form-input text-xs py-1 h-auto"
                                                style={{ maxWidth: '200px' }}
                                                value={p.driver_id || ''}
                                                onChange={(e) => linkDriver(p.id, e.target.value)}
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {drivers.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-neutral-400 italic text-xs">N/A</span>
                                        )}
                                    </td>
                                    <td className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                className="btn btn-outline border-neutral-200 text-neutral-500 hover:text-primary hover:border-primary p-1.5 transition-colors"
                                                title="Cambiar Contraseña"
                                                onClick={() => setResetUserId({ id: p.id, name: p.full_name || 'Usuario' })}
                                            >
                                                <Key size={14} />
                                            </button>
                                            <button 
                                                className="btn btn-outline border-neutral-200 text-red-500 hover:bg-red-50 hover:border-red-200 p-1.5 transition-colors"
                                                title="Eliminar Usuario"
                                                onClick={() => handleDeleteUser(p.id, p.full_name || 'Sin Nombre')}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <select
                                                className="form-input text-sm py-1 h-auto inline-block w-32"
                                                value={p.role}
                                                onChange={(e) => assignRole(p.id, e.target.value as UserRole)}
                                            >
                                                <option value="USER">USER</option>
                                                <option value="ADMIN">ADMIN</option>
                                                <option value="DRIVER">DRIVER</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderDrivers = () => (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="card">
                <div className="card-header border-b">
                    <h3 className="flex items-center gap-2">
                        <UserPlus size={18} className="text-primary" />
                        Registrar Nuevo Chofer
                    </h3>
                </div>
                <div className="card-body">
                    <form onSubmit={addDriver} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="form-label">Nombre Completo</label>
                            <input className="form-input" placeholder="Ej: Roberto Gómez" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">RUT</label>
                            <input className="form-input" placeholder="12.345.678-9" value={newDriverRut} onChange={e => setNewDriverRut(e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Teléfono</label>
                            <div className="flex gap-2">
                                <input className="form-input" placeholder="+56 9 ..." value={newDriverPhone} onChange={e => setNewDriverPhone(e.target.value)} />
                                <button className="btn btn-primary" type="submit">
                                    <UserPlus size={18} />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <div className="card">
                <div className="card-header border-b">
                    <h3 className="flex items-center gap-2">
                        <Truck size={18} className="text-primary" />
                        Choferes Disponibles
                    </h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>RUT</th>
                                <th>Teléfono</th>
                                <th className="text-right">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(d => (
                                <tr key={d.id}>
                                    <td className="font-medium">{d.name}</td>
                                    <td>{d.rut || '-'}</td>
                                    <td>{d.phone || '-'}</td>
                                    <td className="text-right">
                                        <span className={`badge ${d.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                                            {d.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {drivers.length === 0 && (
                                <tr><td colSpan={4} className="p-12 text-center text-neutral-400">No hay choferes registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="max-w-2xl mx-auto">
            <div className="card">
                <div className="card-header border-b">
                    <h3 className="flex items-center gap-2 text-primary">
                        <Shield size={18} /> Configuración de Parámetros
                    </h3>
                </div>
                <div className="card-body space-y-6">
                    <div>
                        <label className="form-label font-semibold">Cantidad de sacos por Pallet</label>
                        <p className="text-sm text-muted mb-4">Define el múltiplo estándar para los cálculos de stock en bodega.</p>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    className="form-input py-2 pl-4"
                                    value={sacksPerPallet}
                                    onChange={(e) => setSacksPerPallet(Number(e.target.value))}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">unidades</span>
                            </div>
                            <button
                                className="btn btn-primary w-auto"
                                onClick={updateSettings}
                                disabled={savingSettings}
                            >
                                {savingSettings ? 'Guardando...' : 'Actualizar Configuración'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-100">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">Importante</h4>
                        <p className="text-xs text-muted leading-relaxed">
                            Este valor afecta directamente los reportes de stock y las visualizaciones del chofer. Los cambios son instantáneos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10">
            {/* Sub-navigation Sidebar (Style Supabase Settings) */}
            <aside>
                <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`nav-item flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'users' ? 'active bg-brand-bg text-primary font-semibold' : 'text-muted hover:bg-neutral-50'}`}
                        style={{ justifyContent: 'flex-start' }}
                    >
                        <Shield size={16} />
                        <span>Usuarios</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('drivers')}
                        className={`nav-item flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'drivers' ? 'active bg-brand-bg text-primary font-semibold' : 'text-muted hover:bg-neutral-50'}`}
                        style={{ justifyContent: 'flex-start' }}
                    >
                        <Truck size={16} />
                        <span>Choferes</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`nav-item flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'active bg-brand-bg text-primary font-semibold' : 'text-muted hover:bg-neutral-50'}`}
                        style={{ justifyContent: 'flex-start' }}
                    >
                        <List size={16} />
                        <span>Logística</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="min-w-0">
                <div className="mx-auto max-w-5xl animate-in fade-in slide-in-from-right-4 duration-300">
                    {activeTab === 'users' && renderUsers()}
                    {activeTab === 'drivers' && renderDrivers()}
                    {activeTab === 'settings' && renderSettings()}
                </div>
            </main>

            {/* Modal Cambiar Contraseña */}
            {resetUserId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                            <Key size={18} className="text-primary" />
                            Cambiar Contraseña
                        </h3>
                        <p className="text-sm text-muted mb-4">Ingresa la nueva contraseña para <strong>{resetUserId.name}</strong>.</p>
                        
                        {resetError && <div className="text-red-500 text-xs mb-3 bg-red-50 p-2 rounded border border-red-100">{resetError}</div>}
                        
                        <input 
                            type="text" 
                            className="form-input w-full mb-5" 
                            placeholder="Nueva contraseña (mín. 6 caracteres)"
                            value={resetPasswordText}
                            onChange={(e) => setResetPasswordText(e.target.value)}
                            disabled={isResetting}
                        />
                        
                        <div className="flex gap-3 justify-end">
                            <button 
                                className="btn btn-outline text-sm py-1.5"
                                onClick={() => { setResetUserId(null); setResetPasswordText(''); setResetError(null); }}
                                disabled={isResetting}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn btn-primary text-sm py-1.5 px-4"
                                onClick={handleResetPassword}
                                disabled={isResetting || resetPasswordText.length < 6}
                            >
                                {isResetting ? 'Guardando...' : 'Cambiar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
