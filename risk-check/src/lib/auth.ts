import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

const secretKey = process.env.SESSION_SECRET || 'default-secret-key-change-me'
const key = new TextEncoder().encode(secretKey)

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key)
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ['HS256'],
    })
    return payload
}

export async function createSession(userId: string, role: string) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ userId, role, expires })

    const cookieStore = await cookies()
    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires,
        sameSite: 'lax',
        path: '/',
    })
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value
    if (!session) return null
    try {
        return await decrypt(session)
    } catch (error) {
        return null
    }
}

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}

export async function hashPassword(password: string) {
    return await bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash)
}
