import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function main() {
    const pdfParse = require('pdf-parse');
    const uploadDir = path.join(__dirname, 'server', 'uploads');
    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'))
        .map(f => ({ name: f, size: fs.statSync(path.join(uploadDir, f)).size }))
        .sort((a, b) => a.size - b.size);

    for (const file of files) {
        console.log(`\n═══ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) ═══`);

        try {
            const buffer = fs.readFileSync(path.join(uploadDir, file.name));
            const data = await pdfParse(buffer);

            const text = data.text;
            console.log(`📏 Texto extraído: ${text.length} caracteres`);
            console.log(`📝 Primeros 500 chars:\n${text.substring(0, 500)}`);

            if (text.toLowerCase().includes('modalidad')) {
                console.log(`\n✅ ¡CONTIENE "modalidad"!`);
                const idx = text.toLowerCase().indexOf('modalidad');
                const start = Math.max(0, idx - 100);
                const end = Math.min(text.length, idx + 300);
                console.log(`📌 Contexto: ...${text.substring(start, end)}...`);
            }
        } catch (e: any) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

main().catch(console.error);
