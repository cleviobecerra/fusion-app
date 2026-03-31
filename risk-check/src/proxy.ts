import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
    const sessionCookie = request.cookies.get('session')?.value
    const path = request.nextUrl.pathname

    // Public routes
    if (path === '/' || path.startsWith('/api') || path.startsWith('/_next') || path.startsWith('/image') || path.startsWith('/favicon.ico')) {
        return NextResponse.next()
    }

    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    try {
        const payload = await decrypt(sessionCookie)
        const role = payload?.role as string

        // Role-based protection
        if (path.startsWith('/dashboard/admin') && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
        }

        if (path.startsWith('/dashboard/testeador') && role === 'SOLICITANTE') {
            return NextResponse.redirect(new URL('/dashboard/solicitante', request.url))
        }

        return NextResponse.next()
    } catch (error) {
        // Invalid session
        const response = NextResponse.redirect(new URL('/', request.url))
        response.cookies.delete('session')
        return response
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
