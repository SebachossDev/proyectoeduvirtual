import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

async function main() {
    const uploadDir = path.join(__dirname, 'server', 'uploads');
    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.pdf'))
        .map(f => ({ name: f, size: fs.statSync(path.join(uploadDir, f)).size }))
        .sort((a, b) => a.size - b.size);

    for (const file of files) {
        console.log(`\n═══ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) ═══`);
        
        try {
            const buffer = fs.readFileSync(path.join(uploadDir, file.name));
            const pdfData = await pdfParse(buffer);
            
            const text = pdfData.text?.trim() || '';
            console.log(`📏 Texto extraído: ${text.length} caracteres`);
            console.log(`📝 Primeros 500 chars:\n${text.substring(0, 500).replace(/\n/g, ' ')}`);
            
            if (text.toLowerCase().includes('modalidad')) {
                console.log(`✅ ¡CONTIENE "modalidad"!`);
            }
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

main().catch(console.error);
