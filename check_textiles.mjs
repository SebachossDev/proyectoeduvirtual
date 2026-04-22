import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const chunks = await prisma.documentChunk.findMany({
        where: { id: '837fb34d-f1ba-403a-a821-570e69938b31' }
    });
    
    for (const c of chunks) {
        console.log(`\n--- CHUNK ${c.id} ---`);
        console.log(c.content);
    }
}

check().finally(() => prisma.$disconnect());
