import { useCallback, useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function FileUpload({ onUploadSuccess }: { onUploadSuccess: () => void }) {
    const { user } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const processData = async (data: any[]) => {
        try {
            const rawOrders = data
                .filter(row => {
                    const values = Object.values(row);
                    return values.some(v => v !== null && v !== undefined && v !== '');
                });

            if (rawOrders.length === 0) {
                throw new Error('No se encontraron datos válidos en el archivo.');
            }

            // --- DE-DUPLICATION LOGIC ---
            // 1. Get all order numbers from the file
            const incomingOrderNumbers = rawOrders
                .map(row => String(row['Núm. Orden'] || row['Nro Orden Compra'] || ''))
                .filter(n => n !== '');

            // 2. Query DB for matches
            const { data: existingOrders } = await supabase
                .from('purchase_orders')
                .select('order_number')
                .in('order_number', incomingOrderNumbers);

            const existingNumbers = new Set(existingOrders?.map(o => o.order_number) || []);

            const ordersToInsert = rawOrders
                .map(row => {
                    const order_number = String(row['Núm. Orden'] || row['Nro Orden Compra'] || '');
                    
                    // Skip if duplicate
                    if (existingNumbers.has(order_number)) return null;

                    const order_date = String(row['Fecha Emisión'] || row['Fecha Orden Compra'] || '');
                    const delivery_address = row['Dir. Local Entrega'] || row['Dirección'] || row['Direccion'] || row['direccion'] || null;
                    const product_code = String(row['Cód. Empaque(EAN13/DUN14)'] || row['Código'] || row['Codigo'] || '');
                    const material = row['Desc. del Producto'] || row['Descripción'] || row['Descripcion'] || row['Material'] || row['material'] || 'No especificado';
                    const price = parseFloat(row['Precio Lista Empaque'] || row['Precio'] || row['precio'] || 0);
                    const quantity = parseFloat(row['Unidades Solicitadas'] || row['Cantidad'] || row['cantidad'] || 0);
                    const total_price = parseFloat(row['Costo Total'] || row['Total'] || row['total'] || 0);
                    
                    const client_name = row['Nombre Local Entrega'] || row['Nombre Local Destino'] || row['Comprador'] || row['Cliente'] || row['cliente'] || 'Desconocido';

                    return {
                        order_number: order_number || null,
                        order_date: order_date || null,
                        client_name,
                        product_code: product_code || null,
                        material,
                        price: isNaN(price) ? 0 : price,
                        quantity: isNaN(quantity) ? 0 : quantity,
                        unit: row['Unidad'] || row['unidad'] || row['UM'] || row['Descripción Empaque'] || 'UN',
                        total_price: isNaN(total_price) ? 0 : total_price,
                        delivery_address: delivery_address,
                        created_by: user?.id,
                        status: 'PENDING'
                    };
                })
                .filter(o => o !== null);

            if (ordersToInsert.length === 0) {
                throw new Error('Todas las órdenes de este archivo ya existen en el sistema.');
            }

            const { error } = await supabase.from('purchase_orders').insert(ordersToInsert);
            if (error) throw error;

            const duplicateCount = rawOrders.length - ordersToInsert.length;
            const successMsg = `¡Se han cargado ${ordersToInsert.length} órdenes exitosamente!${duplicateCount > 0 ? ` (${duplicateCount} duplicadas fueron ignoradas)` : ''}`;

            setMessage({ type: 'success', text: successMsg });
            onUploadSuccess();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Error al procesar el archivo.' });
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        setLoading(true);
        setMessage(null);

        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    }, [user]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setLoading(true);
            setMessage(null);
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (files: File[]) => {
        const file = files[0]; // For now handle one by one

        if (!file) {
            setLoading(false);
            return;
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase();

        if (fileExt === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: any) => {
                    processData(results.data).finally(() => setLoading(false));
                },
                error: (error: any) => {
                    setMessage({ type: 'error', text: 'Error leyendo CSV: ' + error.message });
                    setLoading(false);
                }
            });
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const parsedData = XLSX.utils.sheet_to_json(sheet);
                processData(parsedData).finally(() => setLoading(false));
            };
            reader.readAsBinaryString(file);
        } else {
            setMessage({ type: 'error', text: 'Formato no soportado. Sube CSV o Excel.' });
            setLoading(false);
        }
    };

    return (
        <div className="card mb-6 overflow-hidden">
            <div className="card-header border-b">
                <h3 className="flex items-center gap-2">
                    <Upload size={18} className="text-primary" />
                    Importar Órdenes de Compra
                </h3>
            </div>
            <div className="card-body p-6">
                {message && (
                    <div className={`flex items-center gap-3 p-4 mb-6 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300 ${
                        message.type === 'error' 
                            ? 'bg-red-50 border-red-100 text-red-700' 
                            : 'bg-brand-bg border-primary/20 text-brand-dark'
                    }`}>
                        {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative group cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 py-12 px-6 text-center ${
                        isDragging 
                            ? 'border-primary bg-brand-bg/30 ring-4 ring-primary/5' 
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        onChange={handleFileInput}
                    />
                    
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform duration-200 group-hover:scale-110 ${
                        isDragging ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'
                    }`}>
                        <Upload size={24} />
                    </div>

                    <h4 className="text-lg font-semibold text-neutral-900 mb-1">
                        {loading ? 'Procesando archivo...' : 'Sube tu archivo Excel o CSV'}
                    </h4>
                    <p className="text-sm text-muted max-w-sm mx-auto">
                        Haz clic o arrastra tu archivo aquí. Soporta columnas de Cliente, Material, Cantidad y Dirección.
                    </p>

                    {loading && (
                        <div className="absolute inset-0 bg-[var(--color-surface)]/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                            <div className="flex flex-col items-center gap-3">
                                <div className="spinner"></div>
                                <span className="text-xs font-bold text-primary uppercase tracking-wider">Leyendo Datos</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-muted px-2">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><CheckCircle size={12} className="text-success" /> CSV Soportado</span>
                        <span className="flex items-center gap-1"><CheckCircle size={12} className="text-success" /> Excel Soportado</span>
                    </div>
                    <span>Máx. 5MB por archivo</span>
                </div>
            </div>
        </div>
    );
}
