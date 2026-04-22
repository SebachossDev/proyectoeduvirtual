import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const p2 = await prisma.documentChunk.findFirst({ where: { content: { contains: '[Parte 2/8]' } } });
    const p3 = await prisma.documentChunk.findFirst({ where: { content: { contains: '[Parte 3/8]' } } });
    
    console.log("--- P2 ---");
    console.log(p2?.content);
    console.log("\n\n--- P3 ---");
    console.log(p3?.content);
}

check().finally(() => prisma.$disconnect());
