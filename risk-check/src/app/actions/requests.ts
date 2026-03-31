'use server'

import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import * as XLSX from 'xlsx'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

export async function createRequest(formData: FormData) {
    const session = await getSession()
    const userId = session?.userId as string

    if (!userId) {
        throw new Error('Unauthorized')
    }

    const file = formData.get('file') as File
    const dateStr = formData.get('date') as string

    if (!file || !dateStr) {
        throw new Error('Missing file or date')
    }

    // Parse Date
    const scheduledFor = new Date(dateStr)

    // Parse Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)

    if (rows.length === 0) {
        throw new Error('Excel file is empty')
    }

    // Verify historical results (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const ruts = rows.map((r: any) => String(r.rut || r.RUT || r.Rut || 'S/N')).filter((r: any) => r !== 'S/N')

    // Find latest valid result for each RUT
    const pastResults = await prisma.testResult.findMany({
        where: {
            worker: {
                rut: { in: ruts },
                testRequest: {
                    createdAt: { gte: sixMonthsAgo }
                }
            },
            isDraft: false // Only consider finalized results
        },
        include: {
            worker: {
                select: { rut: true, testRequest: { select: { scheduledFor: true } } }
            }
        },
        orderBy: {
            worker: {
                testRequest: {
                    scheduledFor: 'desc'
                }
            }
        }
    })

    const historyMap = new Map<string, { status: string, date: Date }>()
    pastResults.forEach((res: any) => {
        if (!historyMap.has(res.worker.rut)) {
            historyMap.set(res.worker.rut, {
                status: res.status,
                date: res.worker.testRequest.scheduledFor
            })
        }
    })

    // Create Request and Workers in transaction
    const request = await prisma.testRequest.create({
        data: {
            solicitanteId: userId,
            scheduledFor,
            status: 'PENDING',
            workers: {
                create: rows.map((row: any) => {
                    const rut = String(row.rut || row.RUT || row.Rut || 'S/N')
                    const history = historyMap.get(rut)

                    return {
                        rut,
                        name: String(row.nombre || row.NOMBRE || row.Name || row.Nombre || 'Sin Nombre'),
                        costCenter: String(row['Centro de Costo'] || row.centro_costo || row.CC || row.costCenter || ''),
                        businessUnit: String(row['Unidad de Negocio'] || row.unidad_negocio || row.UN || row.businessUnit || ''),
                        subArea: String(row.subarea || row.SubArea || row.Area || ''),
                        // Try to create result if history exists
                        result: history ? {
                            create: {
                                status: history.status,
                                isDraft: false,
                                isHistorical: true,
                                notes: `Validación Histórica (${history.date.toLocaleDateString('es-CL')})`
                            }
                        } : undefined
                    }
                }),
            },
        },
    })

    revalidatePath('/dashboard/solicitante')
    redirect(`/dashboard/solicitante`)
}
