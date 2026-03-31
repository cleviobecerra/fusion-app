'use server'

import { getSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveResult(workerId: string, status: string | null) {
    const session = await getSession()
    const userId = session?.userId
    if (!userId) throw new Error('Unauthorized')

    if (status === null) {
        // Deselecting: Delete the result
        // We use deleteMany to avoid error if it doesn't exist (though UI implies it might)
        // Or findUnique then delete. upsert handles creation, delete handles removal.
        // Let's safe delete.
        try {
            await prisma.testResult.delete({
                where: { workerId }
            })
        } catch (e) {
            // Ignore if not found
        }
    } else {
        await prisma.testResult.upsert({
            where: { workerId },
            update: { status, isDraft: true },
            create: { workerId, status, isDraft: true }
        })
    }

    // Check if we have the request ID to revalidate specific page, 
    // but specific page path relies on params we might not have here easily unless passed.
    // For now, revalidate the testeador dashboard paths.
    // Ideally we pass requestId to this action or fetch it.

    // Let's fetch the requestId to revalidate the specific page
    const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        select: { requestId: true }
    })

    if (worker) {
        revalidatePath(`/dashboard/testeador/${worker.requestId}`)
    }
}

export async function finalizeRequest(requestId: string) {
    const session = await getSession()
    const userId = session?.userId
    if (!userId) throw new Error('Unauthorized')

    // Update Request Status
    await prisma.testRequest.update({
        where: { id: requestId },
        data: { status: 'COMPLETED' }
    })

    // Find all workers for this request
    const workers = await prisma.worker.findMany({
        where: { requestId },
        select: { id: true }
    })
    const workerIds = workers.map((w: any) => w.id)

    // Mark results as published (not draft)
    await prisma.testResult.updateMany({
        where: { workerId: { in: workerIds } },
        data: { isDraft: false }
    })

    revalidatePath('/dashboard/testeador')
    revalidatePath('/dashboard/solicitante')
    redirect('/dashboard/testeador')
}
