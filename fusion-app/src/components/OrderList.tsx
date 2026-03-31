import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PurchaseOrder, Driver } from '../types/database.types';
import { Calendar, Clock, Save, List } from 'lucide-react';

export function OrderList({ refreshTrigger }: { refreshTrigger: number }) {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [sacksPerPallet, setSacksPerPallet] = useState(56);

    // States for row editing
    const [loadingRowId, setLoadingRowId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [refreshTrigger]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, driversRes] = await Promise.all([
                supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
                supabase.from('drivers').select('*').order('name', { ascending: true })
            ]);

            if (ordersRes.data) setOrders(ordersRes.data);
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
            alert("Error de red o sesión al cargar datos.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = (id: string, field: keyof PurchaseOrder, value: any) => {
        setOrders(orders.map(o => o.id === id ? { ...o, [field]: value } : o));
    };

    const saveOrderAssignments = async (order: PurchaseOrder) => {
        setLoadingRowId(order.id);
        const status = (order.delivery_date && order.delivery_time && order.driver_id) ? 'ASSIGNED' : 'PENDING';

        const toUpdate = {
            delivery_date: order.delivery_date,
            delivery_time: order.delivery_time,
            driver_id: order.driver_id,
            status: status
        };

        const { error } = await supabase
            .from('purchase_orders')
            .update(toUpdate)
            .eq('id', order.id);

        if (!error) {
            handleUpdateField(order.id, 'status', status);
        } else {
            alert('Error updating order: ' + error.message);
        }
        setLoadingRowId(null);
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <div className="text-center">
                <div className="spinner mb-4"></div>
                <p className="text-muted">Cargando órdenes...</p>
            </div>
        </div>
    );

    return (
        <div className="card">
            <div className="card-header border-b">
                <h3 className="flex items-center gap-2">
                    <List size={18} className="text-primary" />
                    Gestión de Órdenes y Logística
                </h3>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Cliente / Detalle</th>
                            <th>Material / SKU</th>
                            <th>Pallets</th>
                            <th style={{ width: '160px' }}>Fecha Entrega</th>
                            <th style={{ width: '120px' }}>Hora</th>
                            <th style={{ width: '180px' }}>Chofer</th>
                            <th>Estado</th>
                            <th className="text-right">Ajustes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map(order => (
                            <tr key={order.id}>
                                <td>
                                    <div className="font-semibold text-neutral-900">{order.client_name}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-medium text-primary bg-brand-bg px-1.5 py-0.5 rounded">
                                            {order.order_number ? `OC: ${order.order_number}` : 'Sin OC'}
                                        </span>
                                        <span className="text-[10px] text-neutral-400">
                                            {order.order_date || 'Sin fecha'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted truncate max-w-[200px] mt-1">
                                        {order.delivery_address || 'Sin dirección'}
                                    </div>
                                </td>
                                <td>
                                    <div className="text-sm">{order.material}</div>
                                    <div className="text-[11px] text-muted mt-0.5">
                                        {order.product_code && `${order.product_code} | `}
                                        {order.quantity} {order.unit}
                                    </div>
                                </td>
                                <td>
                                    <div className="text-sm font-bold text-primary">
                                        {(Number(order.quantity || 0) / sacksPerPallet).toFixed(1)}
                                    </div>
                                    <div className="text-[10px] text-muted">
                                        Eq. Pallets
                                    </div>
                                </td>
                                <td>
                                    {order.status === 'DELIVERED' ? (
                                        <div className="text-success font-medium text-sm flex items-center gap-1">
                                            <Calendar size={12} /> {order.delivery_date}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            className="form-input text-xs py-1"
                                            value={order.delivery_date || ''}
                                            onChange={(e) => handleUpdateField(order.id, 'delivery_date', e.target.value)}
                                        />
                                    )}
                                </td>
                                <td>
                                    {order.status === 'DELIVERED' ? (
                                        <div className="text-success font-medium text-sm flex items-center gap-1">
                                            <Clock size={12} /> {order.delivery_time}
                                        </div>
                                    ) : (
                                        <input
                                            type="time"
                                            className="form-input text-xs py-1"
                                            value={order.delivery_time || ''}
                                            onChange={(e) => handleUpdateField(order.id, 'delivery_time', e.target.value)}
                                        />
                                    )}
                                </td>
                                <td>
                                    <select
                                        className="form-input text-xs py-1"
                                        value={order.driver_id || ''}
                                        onChange={(e) => handleUpdateField(order.id, 'driver_id', e.target.value)}
                                        disabled={order.status === 'DELIVERED'}
                                    >
                                        <option value="">-- No Asignado --</option>
                                        {drivers.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className={`badge ${
                                            order.status === 'DELIVERED' ? 'badge-success' : 
                                            order.status === 'ASSIGNED' ? 'badge-primary' : 'badge-warning'
                                        }`}>
                                            {order.status === 'DELIVERED' ? 'Entregada' : 
                                             order.status === 'ASSIGNED' ? 'Asignada' : 'Pendiente'}
                                        </span>
                                        {order.signed_oc_url && (
                                            <a 
                                                href={order.signed_oc_url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-[10px] text-primary hover:underline"
                                            >
                                                Ver Comprobante
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="text-right">
                                    <button
                                        className={`btn ${loadingRowId === order.id ? 'btn-ghost' : 'btn-secondary'} p-2`}
                                        onClick={() => saveOrderAssignments(order)}
                                        disabled={loadingRowId === order.id || order.status === 'DELIVERED'}
                                        title="Guardar asignación"
                                    >
                                        {loadingRowId === order.id ? <div className="spinner-xs"></div> : <Save size={16} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center p-12 text-muted">
                                    No hay órdenes registradas en el sistema.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
