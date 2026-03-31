'use client'

import { useState } from 'react'
import { WorkerCard } from './worker-card'
import { Button } from '@/components/ui/button'
import { finalizeRequest, saveResult } from '@/app/actions/testing'
import { Send } from 'lucide-react'
import Link from 'next/link'

interface Worker {
    id: string
    name: string
    rut: string
    subArea: string
    result?: {
        status: string
        isHistorical: boolean
        notes?: string | null
    } | null
}

interface RiskEvaluationFormProps {
    requestId: string
    initialWorkers: Worker[]
}

export function RiskEvaluationForm({ requestId, initialWorkers }: RiskEvaluationFormProps) {
    // Local state for workers to enable optimistic updates
    const [workers, setWorkers] = useState(initialWorkers)
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

    // Calculate progress based on local state
    const total = workers.length
    const rated = workers.filter(w => w.result?.status).length
    const progress = Math.round((rated / total) * 100)

    const handleStatusChange = async (workerId: string, newStatus: string | null) => {
        // Optimistic update
        setWorkers(prev => prev.map(w => {
            if (w.id === workerId) {
                return {
                    ...w,
                    result: {
                        ...w.result,
                        status: newStatus || '', // map null to empty string if needed, or handle null schema
                        isHistorical: w.result?.isHistorical || false,
                    } as any
                }
            }
            return w
        }))

        // Track updating state
        setUpdatingIds(prev => new Set(prev).add(workerId))

        try {
            await saveResult(workerId, newStatus)
        } catch (error) {
            // Revert on error (optional implementation)
            console.error("Failed to save result", error)
        } finally {
            setUpdatingIds(prev => {
                const next = new Set(prev)
                next.delete(workerId)
                return next
            })
        }
    }

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-slate-900">Evaluación de Riesgo</h1>
                    {/* Date is passed or rendered in parent, skipping specific date prop for now or can accept it if needed, 
                        but focusing on form logic. Parent already renders header info usually, but here we replace the content.
                        Let's keep the header provided by page if possible, or include it here. 
                        The plan said "Render RiskEvaluationForm instead of raw list". 
                        The Page layout had the header. Let's make this component just the list and footer?
                        Wait, the progress bar is in the header. So this component needs to render the header OR allow lifting state up.
                        Given Server Components, lifting state is hard. Better to move the whole main section here.
                    */}
                    <p className="text-slate-500">
                        Gestión de personal en terreno
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 transition-all duration-300 ease-out">{progress}%</div>
                    <div className="text-sm text-slate-500">Completado ({rated}/{total})</div>
                </div>
            </div>

            <div className="space-y-4">
                {workers.map((worker) => (
                    <WorkerCard
                        key={worker.id}
                        worker={worker}
                        status={worker.result?.status || null}
                        onStatusChange={(status) => handleStatusChange(worker.id, status)}
                        isUpdating={updatingIds.has(worker.id)}
                    />
                ))}
            </div>

            <div className="sticky bottom-4 z-10 bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 flex items-center justify-between">
                <Link href="/dashboard/testeador">
                    <Button variant="outline">Volver</Button>
                </Link>
                <p className="text-slate-600 font-medium absolute left-1/2 -translate-x-1/2 hidden sm:block">
                    {rated < total ? `Faltan ${total - rated}` : 'Listo'}
                </p>
                <form action={finalizeRequest.bind(null, requestId)}>
                    <Button type="submit" disabled={rated < total} className="bg-blue-600 hover:bg-blue-700 transition-all">
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Resultados
                    </Button>
                </form>
            </div>
        </div>
    )
}
