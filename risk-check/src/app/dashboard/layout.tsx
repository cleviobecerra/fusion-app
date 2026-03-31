import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth'
import Link from 'next/link'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">R</div>
                            <span className="font-bold text-xl text-slate-900 hidden sm:inline-block">RiskCheck</span>
                        </div>
                        <nav className="flex items-center gap-4">
                            {session?.role === 'ADMIN' ? (
                                <>
                                    <Link href="/dashboard/solicitante" className="text-sm font-medium text-slate-600 hover:text-slate-900">Solicitar</Link>
                                    <Link href="/dashboard/testeador" className="text-sm font-medium text-slate-600 hover:text-slate-900">Testear</Link>
                                    <Link href="/dashboard/analytics" className="text-sm font-medium text-slate-600 hover:text-slate-900">Estadísticas</Link>
                                    <Link href="/dashboard/admin" className="text-sm font-medium text-slate-600 hover:text-slate-900">Administración</Link>
                                </>
                            ) : session?.role === 'TESTEADOR' ? (
                                <>
                                    <Link href="/dashboard/testeador" className="text-sm font-medium text-slate-600 hover:text-slate-900">Testear</Link>
                                    <Link href="/dashboard/analytics" className="text-sm font-medium text-slate-600 hover:text-slate-900">Estadísticas</Link>
                                </>
                            ) : (
                                <>
                                    <Link href="/dashboard/solicitante" className="text-sm font-medium text-slate-600 hover:text-slate-900">Mis Solicitudes</Link>
                                    <Link href="/dashboard/analytics" className="text-sm font-medium text-slate-600 hover:text-slate-900">Estadísticas</Link>
                                </>
                            )}
                        </nav>
                    </div>
                    <form action={logout}>
                        <Button variant="ghost" type="submit" className="text-slate-600 hover:text-slate-900">
                            Cerrar Sesión
                        </Button>
                    </form>
                </div>
            </header>
            <main className="container mx-auto p-4 py-8 max-w-7xl">
                {children}
            </main>
        </div >
    )
}
