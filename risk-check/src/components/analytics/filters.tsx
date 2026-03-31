'use client'

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface FilterOptions {
    businessUnits: string[]
    subAreas: string[]
    years: string[]
    months: string[]
    days: string[]
}

interface AnalyticsFiltersProps {
    options: FilterOptions
    filters: {
        year?: string
        month?: string
        day?: string
        businessUnit?: string
        subArea?: string
    }
    onChange: (key: string, value: any) => void
}

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export function AnalyticsFilters({ options, filters, onChange }: AnalyticsFiltersProps) {
    return (
        <div className="flex flex-row flex-wrap items-end gap-x-6 gap-y-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col gap-2 min-w-[110px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-0.5">Año</label>
                <Select value={filters.year || 'all'} onValueChange={(val) => onChange('year', val === 'all' ? undefined : val)}>
                    <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {options.years?.map((y: string) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-0.5">Mes</label>
                <Select
                    value={filters.month || 'all'}
                    onValueChange={(val) => onChange('month', val === 'all' ? undefined : val)}
                    disabled={!filters.year}
                >
                    <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                        <SelectValue placeholder={!filters.year ? "Sel. Año" : "Mes"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {options.months?.map((m: string) => (
                            <SelectItem key={m} value={m}>{MONTH_NAMES[parseInt(m) - 1]}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[100px]">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-0.5">Fecha</label>
                <Select
                    value={filters.day || 'all'}
                    onValueChange={(val) => onChange('day', val === 'all' ? undefined : val)}
                    disabled={!filters.month}
                >
                    <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                        <SelectValue placeholder={!filters.month ? "Sel. Mes" : "Día"} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {options.days?.map((d: string) => (
                            <SelectItem key={d} value={d}>{d.padStart(2, '0')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[180px] flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-0.5">U. Negocio</label>
                <Select value={filters.businessUnit} onValueChange={(val) => onChange('businessUnit', val)}>
                    <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {options.businessUnits.map((u: string) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-2 min-w-[180px] flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 ml-0.5">Sub-Área</label>
                <Select value={filters.subArea} onValueChange={(val) => onChange('subArea', val)}>
                    <SelectTrigger className="h-10 border-slate-200 bg-slate-50/30">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {options.subAreas.map((a: string) => (
                            <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Button
                variant="ghost"
                size="sm"
                className="h-10 px-4 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => {
                    onChange('year', undefined)
                    onChange('month', undefined)
                    onChange('day', undefined)
                    onChange('businessUnit', 'all')
                    onChange('subArea', 'all')
                }}
            >
                Limpiar
            </Button>
        </div>
    )
}
