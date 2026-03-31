
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting to database...');
    try {
        // Attempt to create a test user
        const user = await prisma.user.create({
            data: {
                name: 'Test Connectivity User',
                email: `verify-db-${Date.now()}@example.com`,
                role: 'TESTEADOR',
            },
        });
        console.log('Successfully created test user:', user);

        // Attempt to read back
        const count = await prisma.user.count();
        console.log('Total users in DB:', count);

        // Clean up
        await prisma.user.delete({
            where: { id: user.id },
        });
        console.log('Successfully cleaned up test user.');
        console.log('VERIFICATION SUCCESS: Read/Write operations confirmed.');
    } catch (error) {
        console.error('VERIFICATION FAILED:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
