'use server'

import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function registerUser(formData: FormData): Promise<{ error?: string, success?: boolean }> {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string

    if (!name || !email || !password || !role) {
        return { error: 'Todos los campos son requeridos' }
    }

    try {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) return { error: 'Email ya registrado' }

        const hashedPassword = await hashPassword(password)

        await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role
            }
        })

        revalidatePath('/dashboard/admin')
        return { success: true }
    } catch (error) {
        console.error('Register error:', error)
        return { error: 'Error al registrar usuario' }
    }
}
