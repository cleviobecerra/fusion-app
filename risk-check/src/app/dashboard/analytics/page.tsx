'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAnalyticsData, getFilterOptions, getExportData } from '@/app/actions/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { Loader2, Download, BarChart3, Table as TableIcon } from 'lucide-react'
import { AnalyticsFilters } from '@/components/analytics/filters'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<'charts' | 'tables'>('charts')
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [options, setOptions] = useState<{ businessUnits: string[], subAreas: string[], years: string[], months: string[], days: string[] }>({ businessUnits: [], subAreas: [], years: [], months: [], days: [] })
    const [filters, setFilters] = useState<{ year?: string, month?: string, day?: string, businessUnit: string, subArea: string }>({
        year: undefined,
        month: undefined,
        day: undefined,
        businessUnit: 'all',
        subArea: 'all'
    })

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await getAnalyticsData(filters)
            setData(res)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        getFilterOptions().then(setOptions)
    }, [])

    useEffect(() => {
        getFilterOptions(filters.businessUnit, filters.year, filters.month).then(res => {
            setOptions(prev => ({
                ...prev,
                subAreas: res.subAreas,
                months: res.months,
                days: res.days
            }))
        })
    }, [filters.businessUnit, filters.year, filters.month])

    useEffect(() => {
        loadData()
    }, [filters, loadData])

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => {
            const newFilters = { ...prev, [key]: value }
            if (key === 'businessUnit') newFilters.subArea = 'all'
            if (key === 'year') {
                newFilters.month = undefined
                newFilters.day = undefined
            }
            if (key === 'month') newFilters.day = undefined
            return newFilters
        })
    }

    const exportBusinessUnitsToExcel = () => {
        if (!data?.businessUnitStats) return

        const workbook = XLSX.utils.book_new()
        const worksheetData = data.businessUnitStats.map((stat: any) => ({
            'Unidad de Negocio': stat.unit,
            'Inseguros': stat.unsafe,
            'Neutro': stat.neutral,
            'Seguros': stat.safe,
            'Total': stat.total
        }))

        const worksheet = XLSX.utils.json_to_sheet(worksheetData)
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados por Unidad')
        XLSX.writeFile(workbook, `resultados_unidad_negocio_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    }

    const exportDetailedResultsToExcel = async () => {
        setExporting(true)
        try {
            // Fetch full data on demand
            const fullData = await getExportData(filters)
            if (!fullData || fullData.length === 0) return

            const workbook = XLSX.utils.book_new()
            const worksheetData = fullData.map((result: any) => ({
                'Fecha': format(new Date(result.date), 'dd/MM/yyyy'),
                'Nombre': result.workerName,
                'RUT': result.workerRut,
                'Unidad de Negocio': result.businessUnit,
                'Sub-área': result.subArea,
                'Resultado': result.status === 'SAFE' ? 'Seguro' : result.status === 'UNSAFE' ? 'Inseguro' : 'Neutro'
            }))

            const worksheet = XLSX.utils.json_to_sheet(worksheetData)
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados Individuales')
            XLSX.writeFile(workbook, `resultados_individuales_${format(new Date(), 'yyyyMMdd')}.xlsx`)
        } catch (error) {
            console.error("Failed to export", error)
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Estadísticas</h1>

            <AnalyticsFilters
                options={options}
                filters={filters}
                onChange={handleFilterChange}
            />

            <div className="flex space-x-1 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('charts')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
                        activeTab === 'charts'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    Gráficos
                </button>
                <button
                    onClick={() => setActiveTab('tables')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[2px]",
                        activeTab === 'tables'
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    )}
                >
                    <TableIcon className="w-4 h-4" />
                    Tablas
                </button>
            </div>

            {loading ? (
                <div className="flex h-96 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
            ) : !data ? (
                <div className="text-center py-12 text-slate-500">No hay datos disponibles para los filtros seleccionados.</div>
            ) : (
                <>
                    {activeTab === 'charts' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Procesados</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data.totalProcessed}</div>
                                        <p className="text-xs text-muted-foreground">Solicitudes gestionadas</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tests Realizados</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data.realTestsCount}</div>
                                        <p className="text-xs text-muted-foreground">Evaluaciones nuevas</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Históricos</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data.historicalCount}</div>
                                        <p className="text-xs text-muted-foreground">Validaciones automáticas</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{data.passRate}%</div>
                                        <p className="text-xs text-muted-foreground">Sobre el total</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Distribución de Resultados</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data.statusDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {data.statusDistribution.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Tendencia Mensual</CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.trends}>
                                                <XAxis dataKey="date" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="safe" name="Seguro" stackId="a" fill="#22c55e" />
                                                <Bar dataKey="unsafe" name="Inseguro" stackId="a" fill="#ef4444" />
                                                <Bar dataKey="neutral" name="Neutro" stackId="a" fill="#eab308" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tables' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {data.businessUnitStats && (
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Resultados por Unidad de Negocio</CardTitle>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={exportBusinessUnitsToExcel}
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Exportar a Excel
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Unidad de Negocio</TableHead>
                                                    <TableHead className="text-center">Inseguros</TableHead>
                                                    <TableHead className="text-center">Neutro</TableHead>
                                                    <TableHead className="text-center">Seguros</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.businessUnitStats.map((stat: any) => (
                                                    <TableRow key={stat.unit}>
                                                        <TableCell className="font-medium">{stat.unit}</TableCell>
                                                        <TableCell className="text-center">
                                                            {stat.unsafe > 0 ? (
                                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">{stat.unsafe}</Badge>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {stat.neutral > 0 ? (
                                                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">{stat.neutral}</Badge>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {stat.safe > 0 ? (
                                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">{stat.safe}</Badge>
                                                            ) : (
                                                                <span className="text-slate-400">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">{stat.total}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {data.detailedResults && (
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="space-y-1">
                                            <CardTitle>Resultados Individuales</CardTitle>
                                            <p className="text-sm text-slate-500">Mostrando últimos 100 registros (Exportar para ver todo)</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={exportDetailedResultsToExcel}
                                            disabled={exporting}
                                            className="flex items-center gap-2"
                                        >
                                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            Exportar a Excel
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="max-h-[700px] overflow-auto border rounded-sm relative">
                                            <Table>
                                                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                                                    <TableRow>
                                                        <TableHead className="w-[120px]">Fecha</TableHead>
                                                        <TableHead>Nombre</TableHead>
                                                        <TableHead>RUT</TableHead>
                                                        <TableHead>Unidad de Negocio</TableHead>
                                                        <TableHead>Sub-área</TableHead>
                                                        <TableHead className="text-center">Resultado</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {data.detailedResults.map((result: any) => (
                                                        <TableRow key={result.id}>
                                                            <TableCell>{format(new Date(result.date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                                            <TableCell className="font-medium">{result.workerName}</TableCell>
                                                            <TableCell className="text-slate-500">{result.workerRut}</TableCell>
                                                            <TableCell>{result.businessUnit}</TableCell>
                                                            <TableCell>{result.subArea}</TableCell>
                                                            <TableCell className="text-center">
                                                                {result.status === 'SAFE' && (
                                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Seguro</Badge>
                                                                )}
                                                                {result.status === 'UNSAFE' && (
                                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">Inseguro</Badge>
                                                                )}
                                                                {result.status === 'NEUTRAL' && (
                                                                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">Neutro</Badge>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
