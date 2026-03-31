import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { PurchaseOrder } from '../types/database.types';
import { Package, CheckCircle, Upload, FileText, MapPin, Calendar, Clock } from 'lucide-react';

export function DriverDashboard() {
    const { profile } = useAuth();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const fetchMyOrders = async () => {
        if (!profile?.driver_id) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('purchase_orders')
                .select('*')
                .eq('driver_id', profile.driver_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            console.error("Error fetching driver orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyOrders();
    }, [profile]);

    const handleUploadSignedOC = async (orderId: string, file: File) => {
        setUploadingId(orderId);
        try {
            // 1. Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${orderId}_${Date.now()}.${fileExt}`;
            const filePath = `signed/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('signed_ocs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('signed_ocs')
                .getPublicUrl(filePath);

            // 3. Update Order status and URL
            const { error: updateError } = await supabase
                .from('purchase_orders')
                .update({
                    status: 'DELIVERED',
                    signed_oc_url: publicUrl,
                    delivery_date: new Date().toISOString().split('T')[0],
                    delivery_time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
                })
                .eq('id', orderId);

            if (updateError) throw updateError;

            // 4. Update local state
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'DELIVERED', signed_oc_url: publicUrl } : o));
            alert('¡Órden entregada exitosamente!');
        } catch (error: any) {
            alert('Error al subir OC firmada: ' + error.message);
        } finally {
            setUploadingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted">Cargando tus rutas...</div>;

    if (!profile?.driver_id) {
        return (
            <div className="card text-center p-12">
                <h3 className="text-error mb-2">Cuenta no vinculada</h3>
                <p>Tu cuenta de usuario aún no ha sido vinculada a un chofer en el sistema por el administrador.</p>
            </div>
        );
    }

    const pendingOrders = orders.filter(o => o.status !== 'DELIVERED');
    const deliveredOrders = orders.filter(o => o.status === 'DELIVERED');

    return (
        <div className="driver-dashboard space-y-6">
            <div className="section-header">
                <h2 className="flex items-center gap-2"><Package className="text-primary" /> Mis Entregas de Hoy</h2>
                <p className="text-muted text-sm">Gestiona tus órdenes asignadas y reporta las entregas.</p>
            </div>

            {pendingOrders.length === 0 && (
                <div className="card p-8 text-center bg-success-muted border-success shadow-sm">
                    <CheckCircle className="text-success mx-auto mb-2" size={40} />
                    <h4>¡Todo entregado!</h4>
                    <p className="text-sm">No tienes órdenes pendientes por entregar en este momento.</p>
                </div>
            )}

            <div className="grid gap-4">
                {pendingOrders.map(order => (
                    <div key={order.id} className="card shadow-hover">
                        <div className="card-body p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="badge badge-primary mb-2">OC: {order.order_number || 'S/N'}</span>
                                    <h3 className="font-bold text-lg">{order.client_name}</h3>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1 text-sm font-medium text-primary">
                                        {order.quantity} {order.unit}
                                    </div>
                                    <div className="text-xs text-muted">{order.material}</div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-start gap-2 text-sm">
                                    <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                                    <span>{order.delivery_address || 'Sin dirección registrada'}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted">
                                    <div className="flex items-center gap-1"><Calendar size={14} /> {order.delivery_date || 'Hoy'}</div>
                                    <div className="flex items-center gap-1"><Clock size={14} /> {order.delivery_time || '--:--'}</div>
                                </div>
                            </div>

                            <div className="pt-3 border-t">
                                <label className="btn btn-outline-primary w-full flex items-center justify-center gap-2 cursor-pointer">
                                    {uploadingId === order.id ? (
                                        <>Procesando...</>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            Subir OC Firmada y Marcar Entregada
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*,.pdf"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleUploadSignedOC(order.id, file);
                                                }}
                                                disabled={!!uploadingId}
                                            />
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {deliveredOrders.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-muted flex items-center gap-2 text-md font-medium mb-4">
                        <CheckCircle size={18} /> Entregas Completadas Recientes
                    </h3>
                    <div className="grid gap-2">
                        {deliveredOrders.slice(0, 5).map(order => (
                            <div key={order.id} className="card p-3 bg-neutral-muted opacity-80">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-3">
                                        <FileText size={16} className="text-success" />
                                        <div>
                                            <div className="font-bold">{order.client_name}</div>
                                            <div className="text-xs text-muted">OC: {order.order_number}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-success font-bold text-xs"> ENTREGADA</div>
                                        {order.signed_oc_url && (
                                            <a href={order.signed_oc_url} target="_blank" rel="noreferrer" className="text-xs text-link underline decoration-dotted">Ver comprobante</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
