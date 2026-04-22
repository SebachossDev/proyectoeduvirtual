import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const allDoc = await prisma.documentChunk.findMany({
        where: {
            content: {
                contains: 'ABC-Aspectos-basicos-Exportacion.pdf'
            }
        },
        orderBy: { id: 'asc' }
    });
    
    console.log(`\n\nTotal chunks para ABC...: ${allDoc.length}`);
    for (const c of allDoc) {
        console.log(`\n--- CHUNK ${c.id} ---`);
        console.log(c.content.substring(0, 300) + '...');
        if (c.content.includes('Traslado de la')) {
             console.log('>>> TIENE TRASLADO');
        }
        if (c.content.includes('etapas')) {
             console.log('>>> TIENE ETAPAS');
        }
    }
}

check().finally(() => prisma.$disconnect());
