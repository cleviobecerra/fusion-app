import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
import Link from 'next/link'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

export default async function TesteadorDashboard() {
    const requests = await prisma.testRequest.findMany({
        // Removed filter to show all requests
        include: { solicitante: true, workers: true },
        orderBy: [
            { status: 'desc' }, // PENDING comes after COMPLETED alphabetically? No.
            // PENDING > COMPLETED? 
            // Let's sort by scheduledFor for now, user can filter or we can separate visually.
            // Actually, usually pending are more urgent.
            { scheduledFor: 'desc' }
        ]
    })

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel de Testeo</h1>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-900">Fecha</TableHead>
                            <TableHead className="font-semibold text-slate-900">Solicitante</TableHead>
                            <TableHead className="font-semibold text-slate-900">Estado</TableHead>
                            <TableHead className="font-semibold text-slate-900 text-center">Trabajadores</TableHead>
                            <TableHead className="font-semibold text-slate-900 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req: any) => (
                            <TableRow key={req.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-900 capitalize">
                                    {format(new Date(req.scheduledFor), "PPP", { locale: es })}
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {req.solicitante?.name || 'Desconocido'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'COMPLETED' ? 'outline' : 'secondary'} className={req.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}>
                                        {req.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="font-medium text-slate-900">{req.workers.length}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/dashboard/testeador/${req.id}`}>
                                        <Button variant={req.status === 'COMPLETED' ? 'ghost' : 'default'} size="sm">
                                            {req.status === 'COMPLETED' ? 'Ver Resultados' : 'Realizar Test'}
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {requests.length === 0 && (
                    <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                        No hay solicitudes registradas.
                    </div>
                )}
            </div>
        </div>
    )
}
