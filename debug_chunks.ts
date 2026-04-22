import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Count all chunks
    const chunks = await prisma.documentChunk.findMany({
        include: { resource: true }
    });
    console.log(`\n🔍 TOTAL CHUNKS EN LA BASE DE DATOS: ${chunks.length}\n`);

    // 2. Group by course
    const byCourse: Record<string, typeof chunks> = {};
    for (const c of chunks) {
        if (!byCourse[c.courseId]) byCourse[c.courseId] = [];
        byCourse[c.courseId].push(c);
    }

    for (const [courseId, courseChunks] of Object.entries(byCourse)) {
        console.log(`\n═══ Curso: ${courseId} ═══`);
        console.log(`📚 Total chunks: ${courseChunks.length}`);
        console.log(`📏 Total caracteres: ${courseChunks.reduce((sum, c) => sum + c.content.length, 0)}`);
        
        for (const c of courseChunks) {
            console.log(`\n  --- Chunk ${c.id.substring(0,8)} ---`);
            console.log(`  📄 Resource: ${c.resource.title} (${c.resourceId.substring(0,8)})`);
            console.log(`  📏 Length: ${c.content.length} chars`);
            console.log(`  📝 Preview: ${c.content.substring(0, 300)}...`);
            
            // Check if "modalidad" appears in this chunk
            if (c.content.toLowerCase().includes('modalidad')) {
                console.log(`  ✅ ¡CONTIENE "modalidad"!`);
            }
            if (c.content.toLowerCase().includes('exportar') || c.content.toLowerCase().includes('exportación') || c.content.toLowerCase().includes('exportacion')) {
                console.log(`  ✅ ¡CONTIENE "exportar/exportación"!`);
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma['$disconnect']());
