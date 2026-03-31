import prisma from '@/lib/prisma'
import { CreateUserForm } from './create-user-form'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { unstable_cache } from 'next/cache'

const getUsers = unstable_cache(
    async () => {
        return await prisma.user.findMany({
            orderBy: { name: 'asc' }
        })
    },
    ['users-list'],
    { tags: ['users'] }
)

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const users = await getUsers()

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Panel de Administración</h1>

            <div className="grid gap-6 md:grid-cols-2">
                <CreateUserForm />

                <Card>
                    <CardHeader>
                        <CardTitle>Usuarios Registrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Rol</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{user.role}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
