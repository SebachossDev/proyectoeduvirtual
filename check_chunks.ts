import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const chunks = await prisma.documentChunk.findMany({
        where: {
            content: {
                contains: 'Traslado de la mercancía'
            }
        }
    });
    console.log(`Encontrados ${chunks.length} chunks con 'Traslado de la mercancía'`);
    for (const c of chunks) {
        console.log(`\n--- ID: ${c.id} ---`);
        console.log(c.content);
    }
    
    // Also let's print all chunks for that document to see how it was parsed
    const allDoc = await prisma.documentChunk.findMany({
        where: {
            content: {
                contains: 'ABC-Aspectos-basicos-Exportacion.pdf'
            }
        },
        orderBy: { content: 'asc' }
    });
    console.log(`\n\nTotal chunks para ABC...: ${allDoc.length}`);
    for (const c of allDoc) {
        console.log(`\n--- CHUNK ---`);
        console.log(c.content.substring(0, 100) + '...');
        if (c.content.includes('Traslado')) {
             console.log('>>> TIENE TRASLADO');
        }
    }
}

check().finally(() => prisma.$disconnect());
