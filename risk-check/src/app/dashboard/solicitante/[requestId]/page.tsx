import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'

function StatusBadge({ status, isDraft }: { status: string | undefined, isDraft: boolean }) {
    if (isDraft || !status) return <Badge variant="outline" className="text-slate-500"><Clock className="w-3 h-3 mr-1" /> Pendiente</Badge>

    if (status === 'SAFE') return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Seguro</Badge>
    if (status === 'NEUTRAL') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100"><AlertTriangle className="w-3 h-3 mr-1" /> Neutro</Badge>
    if (status === 'UNSAFE') return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100"><XCircle className="w-3 h-3 mr-1" /> Inseguro</Badge>
    return <Badge variant="outline">{status}</Badge>
}

export const dynamic = 'force-dynamic'

export default async function RequestResultPage({ params }: { params: Promise<{ requestId: string }> }) {
    const { requestId } = await params

    const request = await prisma.testRequest.findUnique({
        where: { id: requestId },
        include: { workers: { include: { result: true } } }
    })

    if (!request) notFound()

    // Logic: users can only see results if request is completed?
    // Requirement: "Una vez enviados los resultados, el solicitante... puede ver".
    // If request is PENDING, maybe hide results or show as pending?
    // I'll show them as pending if isDraft is true or request is not completed.

    const isCompleted = request.status === 'COMPLETED';

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/solicitante" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Resultados de Testeo</h1>
                    <div className="flex gap-2 text-slate-500 items-center">
                        <p className="capitalize">{format(new Date(request.scheduledFor), "PPPP", { locale: es })}</p>
                    </div>
                </div>
                <div className="ml-auto">
                    <Badge variant={isCompleted ? 'outline' : 'secondary'} className={isCompleted ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                        {isCompleted ? 'Completado' : 'En Proceso'}
                    </Badge>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-semibold text-slate-900">Nombre</TableHead>
                            <TableHead className="font-semibold text-slate-900">RUT</TableHead>
                            <TableHead className="font-semibold text-slate-900">Centro de Costo</TableHead>
                            <TableHead className="font-semibold text-slate-900">Unidad de Negocio</TableHead>
                            <TableHead className="font-semibold text-slate-900">SubArea</TableHead>
                            <TableHead className="font-semibold text-slate-900 text-right">Resultado</TableHead>
                            <TableHead className="font-semibold text-slate-900 w-[200px]">Fecha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {request.workers.map((worker: any) => (
                            <TableRow key={worker.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium text-slate-900">{worker.name}</TableCell>
                                <TableCell className="text-slate-500">{worker.rut}</TableCell>
                                <TableCell className="text-slate-500">{worker.costCenter}</TableCell>
                                <TableCell className="text-slate-500">{worker.businessUnit}</TableCell>
                                <TableCell className="text-slate-500">{worker.subArea}</TableCell>
                                <TableCell className="text-right">
                                    <StatusBadge
                                        status={worker.result?.status}
                                        isDraft={worker.result?.isDraft ?? true}
                                    />
                                </TableCell>
                                <TableCell>
                                    {(worker.result?.isHistorical || worker.result?.notes) && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                                                Histórico
                                            </Badge>
                                            <span className="text-xs text-slate-500 font-medium">
                                                {worker.result?.notes ? worker.result.notes.replace('Validación Histórica ', '').replace(/[()]/g, '') : ''}
                                            </span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {request.workers.length === 0 && (
                    <div className="p-8 text-center text-slate-500">No hay trabajadores en esta lista.</div>
                )}
            </div>
        </div>
    )
}
