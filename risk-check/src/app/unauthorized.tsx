import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-slate-900">403</h1>
                <h2 className="text-2xl font-semibold text-slate-700">Acceso Denegado</h2>
                <p className="text-slate-500">No tienes permisos para ver esta página.</p>
                <Link href="/">
                    <Button>Volver al Inicio</Button>
                </Link>
            </div>
        </div>
    )
}
