'use server'

import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { verifyPassword, createSession, logout as logoutSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Por favor ingrese correo y contraseña' }
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return { error: 'Credenciales inválidas' }
        }

        const isValid = await verifyPassword(password, user.password)

        if (!isValid) {
            return { error: 'Credenciales inválidas' }
        }

        await createSession(user.id, user.role)

        // Redirect based on role
        if (user.role === 'SOLICITANTE') {
            redirect('/dashboard/solicitante')
        } else if (user.role === 'ADMIN') {
            redirect('/dashboard/admin') // Or testeador if admin view is same
            // Ensure /dashboard/admin exists or redirect to specific page
            // For now, let's assume Admin sees what Testeador sees + User Management
            // redirect('/dashboard/testeador') 
            // Actually requirement says Admin can see stats of all.
        } else {
            redirect('/dashboard/testeador')
        }
    } catch (error: any) {
        if (error.digest?.includes('NEXT_REDIRECT')) {
            throw error
        }
        console.error('Login error:', error)
        return { error: 'Ocurrió un error al iniciar sesión' }
    }

    // Fallback if no redirect happened (should not happen if successful)
    redirect('/dashboard/testeador')
}

export async function logout() {
    await logoutSession()
    redirect('/')
}
