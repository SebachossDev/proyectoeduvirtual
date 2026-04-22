import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const prisma = new PrismaClient();
const uploadDir = path.join(__dirname, 'server', 'uploads');

async function main() {
    const resources = await prisma.resource.findMany({
        include: { session: true }
    });

    console.log(`Encontrados ${resources.length} recursos en total.`);

    for (const resource of resources) {
        if (!resource.url.endsWith('.pdf')) continue;

        const filename = resource.url.split('/').pop();
        if (!filename) continue;

        const filePath = path.join(uploadDir, filename);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Archivo no encontrado: ${filePath}`);
            continue;
        }

        console.log(`\n🔄 Reingestando: ${resource.title} (${filename})`);

        let extractedText = `Documento: "${resource.title}". ${resource.description ? `Descripción: ${resource.description}.` : ''} Módulo: ${resource.session.title}.`;

        try {
            const fileBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(fileBuffer);
            if (pdfData.text && pdfData.text.trim().length > 50) {
                extractedText = pdfData.text.trim();
                console.log(`✅ PDF parseado: ${extractedText.length} caracteres extraídos`);
            } else {
                console.log(`⚠️ PDF parseado pero con texto insuficiente, usando fallback.`);
            }
        } catch (error: any) {
            console.log(`❌ Error al parsear PDF: ${error.message}`);
        }

        // Borrar chunks anteriores
        await prisma.documentChunk.deleteMany({ where: { resourceId: resource.id } });

        // Dividir en chunks
        const CHUNK_SIZE = 1500;
        const OVERLAP = 200;
        const chunks = [];
        for (let i = 0; i < extractedText.length; i += CHUNK_SIZE - OVERLAP) {
            const chunk = extractedText.slice(i, i + CHUNK_SIZE).trim();
            if (chunk.length > 50) chunks.push(chunk);
        }
        if (chunks.length === 0) chunks.push(extractedText);

        await Promise.all(chunks.map((chunk, idx) =>
            prisma.documentChunk.create({
                data: {
                    content: `[Doc: ${resource.title}][Parte ${idx + 1}/${chunks.length}] ${chunk}`,
                    embedding: JSON.stringify([]),
                    courseId: resource.session.courseId,
                    resourceId: resource.id
                }
            })
        ));

        console.log(`📚 Guardados ${chunks.length} chunks.`);
    }

    console.log('\n✅ Proceso completado.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
