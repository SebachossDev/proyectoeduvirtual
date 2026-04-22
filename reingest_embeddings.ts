/**
 * reingest_embeddings.ts
 * 
 * Script para regenerar los embeddings semánticos de TODOS los DocumentChunks existentes
 * usando el modelo Nomic-Embed-Text cargado en LM Studio.
 * 
 * USO: npx tsx reingest_embeddings.ts
 * 
 * PREREQUISITOS:
 * 1. LM Studio debe estar ejecutándose con el modelo nomic-embed-text-v1.5 cargado
 * 2. El servidor de LM Studio debe estar activo en el puerto configurado en .env
 */

import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import 'dotenv/config';

const prisma = new PrismaClient();

const lmStudio = new OpenAI({
    baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    apiKey: 'lm-studio',
});

async function generateEmbedding(text: string): Promise<number[]> {
    const response = await lmStudio.embeddings.create({
        model: process.env.LM_STUDIO_EMBED_MODEL || 'nomic-embed-text-v1.5',
        input: 'search_document: ' + text.slice(0, 8000),
    });
    return response.data[0].embedding;
}

async function main() {
    console.log('🔄 Reingestión de embeddings semánticos iniciada...');
    console.log(`📡 Conectando a LM Studio en: ${process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'}`);
    console.log(`📐 Modelo de embeddings: ${process.env.LM_STUDIO_EMBED_MODEL || 'nomic-embed-text-v1.5'}`);

    const allChunks = await prisma.documentChunk.findMany({
        orderBy: { createdAt: 'asc' },
    });

    console.log(`📚 Total de chunks encontrados: ${allChunks.length}`);

    // Filtrar chunks que ya tienen embeddings válidos (no vacíos)
    const chunksToProcess = allChunks.filter(chunk => {
        const existing = JSON.parse(chunk.embedding || '[]');
        return existing.length === 0;
    });

    console.log(`🎯 Chunks sin embeddings (a procesar): ${chunksToProcess.length}`);
    console.log(`✅ Chunks con embeddings existentes (omitidos): ${allChunks.length - chunksToProcess.length}`);

    if (chunksToProcess.length === 0) {
        console.log('✨ Todos los chunks ya tienen embeddings. Nada que hacer.');
        await prisma.$disconnect();
        return;
    }

    let processed = 0;
    let errors = 0;

    for (const chunk of chunksToProcess) {
        try {
            // Extraer el texto puro del chunk (sin los metadatos [Doc:...][Parte...])
            const cleanText = chunk.content.replace(/\[Doc:.*?\]\[Parte \d+\/\d+\]\s*/, '');
            const embedding = await generateEmbedding(cleanText);

            await prisma.documentChunk.update({
                where: { id: chunk.id },
                data: { embedding: JSON.stringify(embedding) },
            });

            processed++;
            const progress = Math.round((processed / chunksToProcess.length) * 100);
            console.log(`  [${progress}%] ✅ Chunk ${processed}/${chunksToProcess.length} — ${chunk.content.slice(0, 60)}...`);

            // Pequeña pausa para no saturar LM Studio
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
            errors++;
            console.error(`  ❌ Error en chunk ${chunk.id}: ${error.message}`);
        }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`📊 Reingestión completada:`);
    console.log(`   ✅ Procesados: ${processed}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📚 Total chunks en DB: ${allChunks.length}`);
    console.log('═══════════════════════════════════════');

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('💥 Error fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
});
