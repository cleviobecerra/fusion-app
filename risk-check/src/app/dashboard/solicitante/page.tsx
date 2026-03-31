import prisma from '@/lib/prisma'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Eye } from 'lucide-react'
import { getSession } from '@/lib/auth'

export default async function SolicitanteDashboard() {
    const session = await getSession()
    const userId = session?.userId
    const requests = await prisma.testRequest.findMany({
        where: { solicitanteId: userId },
        include: { workers: true },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Mis Solicitudes</h1>
                <Link href="/dashboard/solicitante/new">
                    <Button className="bg-slate-900 text-white hover:bg-slate-800">Nueva Solicitud</Button>
                </Link>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-900">Fecha</TableHead>
                            <TableHead className="font-semibold text-slate-900">Estado</TableHead>
                            <TableHead className="font-semibold text-slate-900">Trabajadores</TableHead>
                            <TableHead className="font-semibold text-slate-900 text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req: any) => (
                            <TableRow key={req.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-900 capitalize">
                                    {format(new Date(req.scheduledFor), "PPP", { locale: es })}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'COMPLETED' ? 'outline' : 'secondary'} className={req.status === 'COMPLETED' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' : ''}>
                                        {req.status === 'COMPLETED' ? 'Completado' : 'Pendiente'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-900">{req.workers.length}</span>
                                        <span className="text-slate-500">Trabajadores</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Link href={`/dashboard/solicitante/${req.id}`}>
                                        <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-700">
                                            <Eye className="w-4 h-4 mr-2" />
                                            Ver Detalles
                                        </Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {requests.length === 0 && (
                    <div className="p-12 text-center text-slate-500 bg-slate-50/50">
                        <p className="mb-4">No tienes solicitudes creadas.</p>
                        <Link href="/dashboard/solicitante/new">
                            <Button variant="outline">Crear mi primera solicitud</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
