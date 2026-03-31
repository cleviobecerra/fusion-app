'use client'

import { useActionState } from 'react'
import { login } from './actions/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function LoginForm() {
    const [state, formAction, isPending] = useActionState(login, null)

    return (
        <form action={formAction} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="usuario@empresa.com"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                />
            </div>

            {state?.error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-200">
                    {state.error}
                </div>
            )}

            <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90" disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Iniciando sesión...
                    </>
                ) : (
                    'Ingresar'
                )}
            </Button>
        </form>
    )
}
