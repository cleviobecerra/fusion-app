import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { PurchaseOrder, Driver } from '../types/database.types';
import { 
    BarChart3, 
    Calendar, 
    Truck, 
    Package, 
    DollarSign, 
    Layers, 
    TrendingUp,
    FileDown
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { 
    ResponsiveContainer, 
    LineChart, 
    Line, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    Cell, 
    PieChart, 
    Pie 
} from 'recharts';

export function Reports() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [sacksPerPallet, setSacksPerPallet] = useState<number>(56);

    // Filters
    const [filterDateStart, setFilterDateStart] = useState<string>(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [filterDateEnd, setFilterDateEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [filterDriver, setFilterDriver] = useState<string>('');
    const [filterMaterial, setFilterMaterial] = useState<string>('');
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

    const cleanMaterialName = (name: string | null | undefined) => {
        if (!name) return '';
        const index = name.toUpperCase().indexOf('SACO');
        if (index === -1) return name.trim();
        return name.substring(0, index).trim();
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, driversRes, settingsRes] = await Promise.all([
                supabase.from('purchase_orders').select('*').order('delivery_date', { ascending: false }),
                supabase.from('drivers').select('*').order('name', { ascending: true }),
                supabase.from('app_settings').select('*').eq('key', 'sacks_per_pallet').single()
            ]);

            if (ordersRes.data) setOrders(ordersRes.data);
            if (driversRes.data) setDrivers(driversRes.data);
            if (settingsRes.data) setSacksPerPallet(Number(settingsRes.data.value));
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered Data
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const date = order.delivery_date ? parseISO(order.delivery_date) : null;
            const matchesDate = !date || isWithinInterval(date, {
                start: parseISO(filterDateStart),
                end: parseISO(filterDateEnd)
            });
            const matchesDriver = !filterDriver || order.driver_id === filterDriver;
            const cleanedMaterial = cleanMaterialName(order.material);
            const matchesMaterial = !filterMaterial || cleanedMaterial.toLowerCase().includes(filterMaterial.toLowerCase());
            
            return matchesDate && matchesDriver && matchesMaterial;
        });
    }, [orders, filterDateStart, filterDateEnd, filterDriver, filterMaterial]);

    // Material list for filter dropdown
    const uniqueMaterials = useMemo(() => {
        const materials = new Set<string>();
        orders.forEach(o => { 
            const cleaned = cleanMaterialName(o.material);
            if (cleaned) materials.add(cleaned); 
        });
        return Array.from(materials).sort();
    }, [orders]);

    // Totals
    const stats = useMemo(() => {
        const calculateSaleComponents = (o: PurchaseOrder) => {
            const net = (o.price || 0) * (Number(o.quantity) || 0);
            const iva = Math.round(net * 0.19);
            const total = net + iva;
            return { net, iva, total };
        };

        const totals = filteredOrders.reduce((acc, o) => {
            const { net, iva, total } = calculateSaleComponents(o);
            return {
                net: acc.net + net,
                iva: acc.iva + iva,
                total: acc.total + total
            };
        }, { net: 0, iva: 0, total: 0 });

        const totalSacks = filteredOrders.reduce((acc, o) => acc + (Number(o.quantity) || 0), 0);
        const totalPallets = totalSacks / sacksPerPallet;

        // Sales & Sacks by material breakdown
        const materialSales: Record<string, number> = {};
        const materialSacks: Record<string, number> = {};

        filteredOrders.forEach(o => {
            const cleanedName = cleanMaterialName(o.material);
            if (!cleanedName) return;
            const { total } = calculateSaleComponents(o);
            const qty = Number(o.quantity) || 0;

            materialSales[cleanedName] = (materialSales[cleanedName] || 0) + total;
            materialSacks[cleanedName] = (materialSacks[cleanedName] || 0) + qty;
        });

        const salesByMaterial = Object.entries(materialSales)
            .sort((a, b) => b[1] - a[1])
            .map(([material, total]) => ({ material, total }));

        const sacksByMaterial = Object.entries(materialSacks)
            .sort((a, b) => b[1] - a[1])
            .map(([material, sacks]) => ({ material, sacks }));

        // Sales by OC breakdown
        const salesByOC = filteredOrders.map(o => {
            const { net, iva, total } = calculateSaleComponents(o);
            return {
                id: o.id,
                oc: o.order_number || 'S/N',
                client: o.client_name,
                material: cleanMaterialName(o.material),
                date: o.delivery_date,
                net,
                iva,
                total
            };
        }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        return {
            totalNet: totals.net,
            totalIVA: totals.iva,
            totalTotal: totals.total,
            totalSacks,
            totalPallets,
            salesByMaterial,
            sacksByMaterial,
            salesByOC,
            count: filteredOrders.length
        };
    }, [filteredOrders, sacksPerPallet]);

    // Grouping by period
    const periodicData = useMemo(() => {
        const groups: Record<string, { label: string, sales: number, sacks: number, pallets: number, count: number }> = {};

        filteredOrders.forEach(order => {
            if (!order.delivery_date) return;
            const date = parseISO(order.delivery_date);
            let key = '';
            let label = '';

            if (viewMode === 'weekly') {
                const start = startOfWeek(date, { weekStartsOn: 1 });
                const end = endOfWeek(date, { weekStartsOn: 1 });
                key = format(start, 'yyyy-MM-dd');
                label = `Semana ${format(start, 'dd/MM')} al ${format(end, 'dd/MM')}`;
            } else {
                key = format(date, 'yyyy-MM');
                label = format(date, 'MMMM yyyy', { locale: es });
            }

            if (!groups[key]) {
                groups[key] = { label, sales: 0, sacks: 0, pallets: 0, count: 0 };
            }

            const net = (order.price || 0) * (Number(order.quantity) || 0);
            const total = net + Math.round(net * 0.19);
            
            groups[key].sales += total;
            const qty = (Number(order.quantity) || 0);
            groups[key].sacks += qty;
            groups[key].pallets += qty / sacksPerPallet;
            groups[key].count += 1;
        });

        const sorted = Object.entries(groups)
            .sort((a, b) => a[0].localeCompare(b[0])) // Oldest first for charts
            .map(([_, val]) => val);
        
        return sorted;
    }, [filteredOrders, viewMode, sacksPerPallet]);

    // Sorting trend data for Table vs Chart
    const trendTableData = useMemo(() => [...periodicData].reverse(), [periodicData]);

    const handleExportExcel = () => {
        if (stats.salesByOC.length === 0) return;

        const exportData = stats.salesByOC.map(o => ({
            'OC #': o.oc,
            'Fecha': o.date ? format(parseISO(o.date), 'dd/MM/yyyy') : '',
            'Cliente': o.client,
            'Material': o.material,
            'Neto': o.net,
            'IVA (19%)': o.iva,
            'Total (Bruto)': o.total
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte de Ventas");

        // Column widths
        const wscols = [
            { wch: 15 }, // OC
            { wch: 12 }, // Fecha
            { wch: 25 }, // Cliente
            { wch: 20 }, // Material
            { wch: 15 }, // Neto
            { wch: 12 }, // IVA
            { wch: 15 }  // Total
        ];
        ws['!cols'] = wscols;

        XLSX.writeFile(wb, `Reporte_Ventas_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
    };

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            
            {/* ── Filter Bar ── */}
            <div className="card shadow-sm border-neutral-100">
                <div className="card-body">
                    <div className="flex flex-col lg:flex-row gap-6 items-end justify-between">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full">
                            <div>
                                <label className="form-label flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" />
                                    Desde
                                </label>
                                <input type="date" className="form-input" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-2">
                                    <Calendar size={14} className="text-primary" />
                                    Hasta
                                </label>
                                <input type="date" className="form-input" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-2">
                                    <Truck size={14} className="text-primary" />
                                    Chofer
                                </label>
                                <select className="form-input" value={filterDriver} onChange={e => setFilterDriver(e.target.value)}>
                                    <option value="">Todos los choferes</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="form-label flex items-center gap-2">
                                    <Package size={14} className="text-primary" />
                                    Material
                                </label>
                                <select className="form-input" value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}>
                                    <option value="">Todos los materiales</option>
                                    {uniqueMaterials.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex bg-neutral-100 p-1 rounded-lg self-start lg:self-end">
                            <button 
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'weekly' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-neutral-900'}`}
                                onClick={() => setViewMode('weekly')}
                            >
                                Semanal
                            </button>
                            <button 
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'monthly' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-neutral-900'}`}
                                onClick={() => setViewMode('monthly')}
                            >
                                Mensual
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── KPI Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="col-span-2 lg:col-span-1 card group hover:scale-[1.02] transition-all duration-300 bg-white border border-neutral-200">
                    <div className="card-body">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-all">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Ventas Totales (Bruto)</p>
                                <h4 className="text-2xl font-bold text-neutral-900">${stats.totalTotal.toLocaleString('es-CL')}</h4>
                            </div>
                        </div>
                        
                        {/* Summary Details */}
                        <div className="grid grid-cols-2 gap-2 mb-4 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                            <div>
                                <p className="text-[8px] font-bold text-muted uppercase">Neto</p>
                                <p className="text-[11px] font-semibold text-neutral-700">${stats.totalNet.toLocaleString('es-CL')}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-bold text-muted uppercase">IVA (19%)</p>
                                <p className="text-[11px] font-semibold text-neutral-700">${stats.totalIVA.toLocaleString('es-CL')}</p>
                            </div>
                        </div>

                        {/* Breakdown Header */}
                        <div className="pt-3 border-t border-neutral-100 mb-2">
                            <p className="text-[9px] font-bold text-muted uppercase tracking-tighter mb-2">Total por Material (Bruto)</p>
                        </div>
                        <div className="space-y-1">
                            {stats.salesByMaterial.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center group/row">
                                    <span className="text-[11px] text-muted truncate max-w-[120px] group-hover/row:text-neutral-900 transition-colors">{item.material}</span>
                                    <div className="flex-1 mx-2 border-b border-dotted border-neutral-200 self-end mb-1"></div>
                                    <span className="text-[11px] font-bold text-neutral-700">${item.total.toLocaleString('es-CL')}</span>
                                </div>
                            ))}
                            {stats.salesByMaterial.length === 0 && (
                                <p className="text-center text-[10px] italic text-muted py-2">Sin datos de venta</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card group hover:scale-[1.02] transition-all duration-300 bg-white border border-neutral-200">
                    <div className="card-body flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all">
                            <Package size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Sacos</p>
                            <h4 className="text-2xl font-bold text-neutral-900">{stats.totalSacks.toLocaleString('es-CL')} <span className="text-sm font-normal text-muted">SC</span></h4>
                        </div>
                    </div>
                </div>

                <div className="card group hover:scale-[1.02] transition-all duration-300 bg-white border border-neutral-200">
                    <div className="card-body flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Layers size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Total Pallets</p>
                            <h4 className="text-2xl font-bold text-neutral-900">{stats.totalPallets.toFixed(1)} <span className="text-sm font-normal text-muted">PL</span></h4>
                        </div>
                    </div>
                </div>

                <div className="card group hover:scale-[1.02] transition-all duration-300 bg-white border border-neutral-200">
                    <div className="card-body flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Pedidos</p>
                            <h4 className="text-2xl font-bold text-neutral-900">{stats.count} <span className="text-sm font-normal text-muted">docs</span></h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Visual Charts Section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sale Trend Chart */}
                <div className="card shadow-sm border border-neutral-200 p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary" />
                        Tendencia de Ventas Brutas
                    </h3>
                    <div className="h-300 w-full" style={{ minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={periodicData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="label" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`}
                                />
                                <Tooltip 
                                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-CL')}`, 'Ventas Brutas']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="sales" 
                                    stroke="#2563eb" 
                                    strokeWidth={3} 
                                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Material Sales Bar Chart */}
                <div className="card shadow-sm border border-neutral-200 p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <DollarSign size={20} className="text-primary" />
                        Ventas por Material ($ Bruto)
                    </h3>
                    <div className="h-350 w-full" style={{ minHeight: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.salesByMaterial} margin={{ bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="material" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: '#6b7280', angle: -45, textAnchor: 'end' }}
                                    interval={0}
                                    height={60}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                    tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`}
                                />
                                <Tooltip 
                                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-CL')}`, 'Ventas']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="total" radius={[4, 4, 0, 0]} fill="#2563eb">
                                    {stats.salesByMaterial.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sacks por Material Bar Chart */}
                <div className="card shadow-sm border border-neutral-200 p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Package size={20} className="text-primary" />
                        Total Sacos por Material (Unidades)
                    </h3>
                    <div className="h-350 w-full" style={{ minHeight: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.sacksByMaterial} margin={{ bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis 
                                    dataKey="material" 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 9, fill: '#6b7280', angle: -45, textAnchor: 'end' }}
                                    interval={0}
                                    height={60}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#6b7280' }}
                                />
                                <Tooltip 
                                    formatter={(val: any) => [`${Number(val).toLocaleString('es-CL')} sacos`, 'Cantidad']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="sacks" radius={[4, 4, 0, 0]} fill="#10b981">
                                    {stats.sacksByMaterial.map((_, index) => (
                                        <Cell key={`cell-sacks-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Market Share Pie Chart */}
                <div className="card shadow-sm border border-neutral-200 p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Layers size={20} className="text-primary" />
                        Participación del Mercado (Ventas)
                    </h3>
                    <div className="h-300 w-full" style={{ minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.salesByMaterial}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="total"
                                    nameKey="material"
                                >
                                    {stats.salesByMaterial.map((_, index) => (
                                        <Cell key={`cell-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-CL')}`, 'Ventas']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    formatter={(val) => <span className="text-[10px] text-muted">{val}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Summary Table ── */}
            <div className="card border border-neutral-200 overflow-hidden">
                <div className="card-header flex items-center justify-between border-b bg-neutral-50/50 py-3 px-6">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                        <BarChart3 size={18} className="text-primary" />
                        Tabla Comparativa {viewMode === 'weekly' ? 'Semanal' : 'Mensual'}
                    </h3>
                </div>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr className="bg-neutral-50/30">
                                <th>Periodo</th>
                                <th className="text-right">Ventas Brutas</th>
                                <th className="text-right">Sacos</th>
                                <th className="text-right">Pallets</th>
                                <th className="text-right">Pedidos</th>
                                <th className="text-center w-40">Rendimiento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trendTableData.map((data) => (
                                <tr key={data.label} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="font-semibold text-neutral-900">{data.label}</td>
                                    <td className="text-right font-bold text-green-600">${data.sales.toLocaleString('es-CL')}</td>
                                    <td className="text-right">{data.sacks.toLocaleString('es-CL')}</td>
                                    <td className="text-right">{data.pallets.toFixed(1)}</td>
                                    <td className="text-right">{data.count}</td>
                                    <td className="text-center">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-neutral-100 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className="bg-primary h-full rounded-full transition-all duration-1000" 
                                                    style={{ width: `${Math.min(100, (data.sales / (trendTableData[0]?.sales || 1)) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted w-8">
                                                {Math.round(Math.min(100, (data.sales / (trendTableData[0]?.sales || 1)) * 100))}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {periodicData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-muted italic">
                                        No se encontraron datos para los filtros seleccionados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── OC Breakdown Table ── */}
            <div className="card border border-neutral-200 overflow-hidden">
                <div className="card-header flex items-center justify-between border-b bg-neutral-50/50 py-3 px-6">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                        <Package size={18} className="text-primary" />
                        Desglose por Orden de Compra (OC)
                    </h3>
                    <button 
                        onClick={handleExportExcel}
                        className="btn btn-primary flex items-center gap-2 px-4 py-1.5 h-auto text-sm"
                    >
                        <FileDown size={16} />
                        Exportar Excel
                    </button>
                </div>
                <div className="table-container max-h-[500px] overflow-y-auto">
                    <table className="table">
                        <thead>
                            <tr className="bg-neutral-50/30">
                                <th>OC #</th>
                                <th>Fecha</th>
                                <th>Cliente</th>
                                <th>Material</th>
                                <th className="text-right">Neto</th>
                                <th className="text-right">IVA (19%)</th>
                                <th className="text-right">Total (Bruto)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.salesByOC.map((data) => (
                                <tr key={data.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="font-bold text-neutral-900">{data.oc}</td>
                                    <td className="text-xs text-muted">{data.date ? format(parseISO(data.date), 'dd/MM/yyyy') : 'S/F'}</td>
                                    <td className="text-xs truncate max-w-[150px]">{data.client}</td>
                                    <td className="text-xs italic">{data.material}</td>
                                    <td className="text-right text-xs">${data.net.toLocaleString('es-CL')}</td>
                                    <td className="text-right text-[10px] text-muted">${data.iva.toLocaleString('es-CL')}</td>
                                    <td className="text-right font-bold text-primary">${data.total.toLocaleString('es-CL')}</td>
                                </tr>
                            ))}
                            {stats.salesByOC.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-20 text-muted italic">
                                        No se encontraron órdenes para los filtros seleccionados
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    );
}
