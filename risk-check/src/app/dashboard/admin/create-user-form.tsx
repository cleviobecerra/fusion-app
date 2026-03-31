'use client'

import { useState } from 'react'
import { registerUser } from './actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

export function CreateUserForm() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMessage('')
        try {
            const res = await registerUser(formData)
            if (res.error) {
                setMessage(`Error: ${res.error}`)
            } else {
                setMessage('Usuario creado exitosamente')
                // Reset form somehow or just show success
            }
        } catch (error) {
            setMessage('Error al crear usuario')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registrar Nuevo Usuario</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre</Label>
                            <Input id="name" name="name" required placeholder="Nombre Completo" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" required placeholder="correo@empresa.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select name="role" required defaultValue="SOLICITANTE">
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar Rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SOLICITANTE">Solicitante</SelectItem>
                                    <SelectItem value="TESTEADOR">Testeador</SelectItem>
                                    <SelectItem value="ADMIN">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {message && <p className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}

                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Crear Usuario
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
