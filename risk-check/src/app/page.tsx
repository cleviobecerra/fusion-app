import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
import { LoginForm } from './login-form'

export default async function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">RiskCheck</h1>
          <p className="mt-2 text-slate-600">Gestión de Test de Aversión al Riesgo</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider text-center">
            Ingresa tus credenciales
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
