
import prisma from '../src/lib/prisma';
import { unstable_cache } from 'next/cache';

// Mocking unstable_cache for script environment if needed, 
// but here we want to test if it's available and working in this context.
// Note: unstable_cache might only work within Next.js runtime.
// If it fails, we'll verify by running the dev server and checking logs.

async function testCache() {
    console.log('--- Performance Verification ---');

    const getUsers = unstable_cache(
        async () => {
            const start = performance.now();
            const data = await prisma.user.findMany({ orderBy: { name: 'asc' } });
            const end = performance.now();
            console.log(`[Cache Miss] DB Query took: ${(end - start).toFixed(2)}ms`);
            return data;
        },
        ['test-users-list'],
        { tags: ['users'] }
    );

    console.log('First call (should be miss)...');
    await getUsers();

    console.log('Second call (should be hit)...');
    const startHit = performance.now();
    await getUsers();
    const endHit = performance.now();
    console.log(`[Cache Hit] Total time: ${(endHit - startHit).toFixed(2)}ms`);

    console.log('--- End of Test ---');
}

testCache().catch(console.error).finally(() => prisma.$disconnect());
