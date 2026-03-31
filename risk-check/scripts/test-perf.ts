
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting performance test...');

    // Warmup
    const startWarm = performance.now();
    await prisma.user.findFirst();
    const endWarm = performance.now();
    console.log(`Warmup query: ${(endWarm - startWarm).toFixed(2)}ms`);

    // Read Test
    const startRead = performance.now();
    const users = await prisma.user.findMany();
    const endRead = performance.now();
    console.log(`Read query (${users.length} records): ${(endRead - startRead).toFixed(2)}ms`);

    // Write Test
    const startWrite = performance.now();
    const user = await prisma.user.create({
        data: {
            name: 'Perf Test User',
            email: `perf-test-${Date.now()}@example.com`,
            role: 'TESTEADOR',
        },
    });
    const endWrite = performance.now();
    console.log(`Write query: ${(endWrite - startWrite).toFixed(2)}ms`);

    // Cleanup
    await prisma.user.delete({ where: { id: user.id } });

    console.log('Test complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
