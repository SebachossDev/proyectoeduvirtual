import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import 'dotenv/config';
import OpenAI from 'openai';
import PQueue from 'p-queue';

// ═══ LM Studio Local Client (API compatible con OpenAI) ═══
const lmStudio = new OpenAI({
    baseURL: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    apiKey: 'lm-studio', // LM Studio ignora la API key, pero el SDK la requiere
});

// ═══ Cola de Peticiones (Anti-Saturación para modelo local) ═══
const aiQueue = new PQueue({
    concurrency: parseInt(process.env.AI_MAX_CONCURRENCY || '1'),
    timeout: parseInt(process.env.AI_QUEUE_TIMEOUT_MS || '60000'),
});

console.log(`🤖 AI Queue: concurrency=${aiQueue.concurrency}, timeout=${process.env.AI_QUEUE_TIMEOUT_MS || '60000'}ms`);

// ═══ Helper: Generar Embeddings Semánticos con Nomic-Embed-Text ═══
async function generateEmbedding(text: string, type: 'document' | 'query'): Promise<number[]> {
    const prefix = type === 'document' ? 'search_document: ' : 'search_query: ';
    try {
        const response = await lmStudio.embeddings.create({
            model: process.env.LM_STUDIO_EMBED_MODEL || 'nomic-embed-text-v1.5',
            input: prefix + text.slice(0, 8000), // Respetar context window de Nomic (8192 tokens)
        });
        return response.data[0].embedding;
    } catch (error: any) {
        console.warn('⚠️ Embedding generation failed (LM Studio embedding model loaded?):', error.message);
        return []; // Fallback: sin embedding, se usará solo keyword scoring
    }
}

// ═══ Helper: Similitud Coseno entre dos vectores ═══
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// En ES Modules (vite/tsx) no existe __dirname de forma nativa. Lo construimos así:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear la carpeta uploads si no existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });



const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ----- SSE SETUP FOR REAL-TIME -----
const clients = new Set<express.Response>();

app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.add(res);

    req.on('close', () => {
        clients.delete(res);
    });
});

const sendEventToClients = (eventData: any) => {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(eventData)}\n\n`);
    });
};
// -----------------------------------

// 1. Auth Login
app.post('/api/login', async (req, res) => {
    const code = req.body.code?.trim();
    const password = req.body.password?.trim();
    try {
        const user = await prisma.user.findUnique({ where: { code } });
        if (!user || user.password.trim() !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// 2. Usuarios (Solo ADMIN)
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
    });
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const { name, role } = req.body;
    const code = req.body.code?.trim();
    const password = req.body.password?.trim();
    try {
        const user = await prisma.user.create({
            data: { name, code, password, role }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear usuario (quizá el código ya existe)' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, role } = req.body;
    const code = req.body.code?.trim();
    const password = req.body.password?.trim();
    try {
        const dataToUpdate: any = { name, code, role };
        if (password && password.length > 0) {
            dataToUpdate.password = password;
        }
        const user = await prisma.user.update({
            where: { id },
            data: dataToUpdate
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar usuario' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: 'Error al eliminar usuario' });
    }
});

// 3. Cursos
app.get('/api/courses', async (req, res) => {
    const teacherId = req.query.teacherId as string;
    try {
        const whereClause = teacherId ? { teacherId } : {};
        const courses = await prisma.course.findMany({
            where: whereClause,
            include: { teacher: true, sessions: { include: { resources: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(courses);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/courses', async (req, res) => {
    const { title, description, teacherId } = req.body;
    try {
        const course = await prisma.course.create({
            data: { title, description, teacherId }
        });
        res.json(course);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/courses/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    try {
        const course = await prisma.course.update({
            where: { id },
            data: { title, description }
        });
        res.json(course);
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Error al actualizar curso' });
    }
});

app.delete('/api/courses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.course.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: 'Error al eliminar curso' });
    }
});

app.get('/api/courses/:courseId/participants', async (req, res) => {
    const { courseId } = req.params;
    const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: { student: true }
    });
    res.json(enrollments);
});

// Añadir estudiante por código
app.post('/api/courses/:courseId/enroll', async (req, res) => {
    const { courseId } = req.params;
    const code = req.body.code?.trim();

    try {
        const student = await prisma.user.findUnique({ where: { code } });

        if (!student) {
            return res.status(404).json({ error: 'Estudiante no encontrado con ese código' });
        }
        if (student.role !== 'STUDENT') {
            return res.status(400).json({ error: 'El código pertenece a un usuario que no es estudiante' });
        }

        const enrollment = await prisma.enrollment.create({
            data: { studentId: student.id, courseId }
        });
        res.json(enrollment);
    } catch (error: any) {
        res.status(400).json({ error: 'Error al matricular, es posible que el estudiante ya esté en el curso' });
    }
});

// Registrar último acceso del estudiante a un curso
app.put('/api/courses/:courseId/access/:studentId', async (req, res) => {
    const { courseId, studentId } = req.params;
    try {
        const enrollment = await prisma.enrollment.findUnique({
            where: { studentId_courseId: { studentId, courseId } }
        });

        if (enrollment) {
            await prisma.enrollment.update({
                where: { id: enrollment.id },
                data: { lastAccessAt: new Date() }
            });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Matrícula no encontrada' });
        }
    } catch (error: any) {
        res.status(400).json({ error: 'Error al actualizar último acceso' });
    }
});

// Eliminar estudiante del curso (desmatricular)
app.delete('/api/enrollments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.enrollment.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: 'Error al desmatricular al estudiante' });
    }
});

// NUEVO: Obtener los cursos matriculados de un estudiante específico (para el Student Dashboard)
app.get('/api/students/:studentId/courses', async (req, res) => {
    const { studentId } = req.params;
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId },
            include: {
                course: {
                    include: {
                        teacher: true,
                        sessions: {
                            include: { resources: true }
                        }
                    }
                }
            },
            orderBy: { enrolledAt: 'desc' }
        });

        // Mapeamos para enviar un arreglo de cursos en lugar de enrollments crudos
        const enrolledCourses = enrollments.map(e => ({
            ...e.course,
            progress: e.grade ? Math.min(100, Math.round((e.grade / 10) * 100)) : 0, // Mocking progress based on grade or 0
        }));

        res.json(enrolledCourses);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


app.put('/api/enrollments/:enrollmentId/grade', async (req, res) => {
    const { enrollmentId } = req.params;
    const { grade } = req.body;
    try {
        const enrollment = await prisma.enrollment.update({
            where: { id: enrollmentId },
            data: { grade }
        });
        res.json(enrollment);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 4. Sesiones y Recursos
app.get('/api/courses/:courseId/sessions', async (req, res) => {
    const { courseId } = req.params;
    const sessions = await prisma.session.findMany({
        where: { courseId },
        include: { resources: true },
        orderBy: { order: 'asc' }
    });
    res.json(sessions);
});

app.post('/api/sessions', async (req, res) => {
    const { title, description, courseId, order } = req.body;
    try {
        const session = await prisma.session.create({
            data: { title, description, courseId, order: order || 0 }
        });
        res.json(session);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/resources', upload.single('file'), async (req: any, res: any) => {
    const { title, description, sessionId, type } = req.body;

    // Generar la URL pública real
    let finalUrl = '';
    if (req.file) {
        finalUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    } else {
        return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    try {
        const resource = await prisma.resource.create({
            data: { title, description, url: finalUrl, type, sessionId },
            include: { session: true }
        });

        // === PIPELINE DE INGESTIÓN REAL (RAG) ===
        // Borrar chunks anteriores de este recurso para evitar duplicados
        await prisma.documentChunk.deleteMany({ where: { resourceId: resource.id } });

        let extractedText = `Documento: "${title}". ${description ? `Descripción: ${description}.` : ''} Módulo: ${resource.session.title}.`;

        // Extraer texto real del PDF si el archivo es PDF
        if (req.file && req.file.mimetype === 'application/pdf') {
            try {
                const fileBuffer = fs.readFileSync(req.file.path);
                const pdfData = await pdfParse(fileBuffer);
                if (pdfData.text && pdfData.text.trim().length > 50) {
                    extractedText = pdfData.text.trim();
                    console.log(`✅ PDF parseado: ${title} - ${extractedText.length} caracteres extraídos`);
                }
            } catch (pdfError: any) {
                console.warn(`⚠️ No se pudo parsear el PDF '${title}':`, pdfError.message);
            }
        }

        // Dividir en chunks de ~1500 caracteres con solapamiento de 200
        const CHUNK_SIZE = 1500;
        const OVERLAP = 200;
        const chunks: string[] = [];
        for (let i = 0; i < extractedText.length; i += CHUNK_SIZE - OVERLAP) {
            const chunk = extractedText.slice(i, i + CHUNK_SIZE).trim();
            if (chunk.length > 50) chunks.push(chunk);
        }
        if (chunks.length === 0) chunks.push(extractedText);

        // Generar embeddings semánticos para cada chunk (si LM Studio tiene Nomic-Embed-Text cargado)
        for (let idx = 0; idx < chunks.length; idx++) {
            const chunkContent = `[Doc: ${title}][Parte ${idx + 1}/${chunks.length}] ${chunks[idx]}`;
            const embeddingVec = await generateEmbedding(chunks[idx], 'document');
            await prisma.documentChunk.create({
                data: {
                    content: chunkContent,
                    embedding: JSON.stringify(embeddingVec),
                    courseId: resource.session.courseId,
                    resourceId: resource.id
                }
            });
        }
        console.log(`📚 RAG: ${chunks.length} chunk(s) guardados para "${title}" en curso ${resource.session.courseId}`);
        // ==============================================

        // Evento en tiempo real
        sendEventToClients({ type: 'NEW_RESOURCE', payload: { resource, courseId: resource.session.courseId } });

        res.json(resource);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


app.put('/api/resources/:id', async (req, res) => {
    const { id } = req.params;
    const { title, description, url, type } = req.body;
    try {
        const resource = await prisma.resource.update({
            where: { id },
            data: { title, description, url, type }
        });
        res.json(resource);
    } catch (error: any) {
        console.error("PUT /api/resources/:id ERROR:", error);
        res.status(400).json({ error: error.message || 'Error al actualizar recurso' });
    }
});

app.delete('/api/resources/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.resource.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: 'Error al eliminar recurso' });
    }
});

// 5. Mochila Virtual (Estudiante guarda recursos, notas, e insights)
app.get('/api/backpack/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const { type, courseId } = req.query;

    // Configurar filtros dinámicamente
    let whereClause: any = { studentId };
    if (type && type !== 'ALL') whereClause.type = type;
    if (courseId) whereClause.courseId = courseId;

    try {
        const items = await prisma.backpackItem.findMany({
            where: whereClause,
            include: { resource: true, course: true },
            orderBy: { savedAt: 'desc' }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching backpack' });
    }
});

app.post('/api/backpack', async (req, res) => {
    const { studentId, type, title, content, courseId, resourceId, tags } = req.body;
    try {
        const item = await prisma.backpackItem.create({
            data: { studentId, type, title, content, courseId, resourceId, tags }
        });
        res.json(item);
    } catch (error: any) {
        console.error(error);
        res.status(400).json({ error: 'Error al agregar a la mochila' });
    }
});

app.delete('/api/backpack/:itemId', async (req, res) => {
    const { itemId } = req.params;
    try {
        await prisma.backpackItem.delete({ where: { id: itemId } });
        res.json({ success: true });
    } catch (error: any) {
        res.status(400).json({ error: 'Error al eliminar item de la mochila' });
    }
});

// 6. RAG AI Experto (Aislamiento Multi-Tenant + Anti-Alucinación Estricta)
app.post('/api/ai/chat', async (req, res) => {
    const { studentId, courseId, query } = req.body;

    try {
    // Validación y Autorización Rígida
    const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: String(studentId), courseId: String(courseId) } },
        include: { course: true }
    });

    if (!enrollment) {
        return res.status(403).json({ error: "Acceso denegado a este contexto." });
    }

    // ═══════════════════════════════════════════════════════════════
    // RETRIEVAL OPTIMIZADO: Scoring Semántico y Expansión de Contexto
    // ═══════════════════════════════════════════════════════════════
    // Paso 1: Obtener TODOS los chunks del curso
    const allChunks = await prisma.documentChunk.findMany({
        where: { courseId: courseId }
    });

    if (allChunks.length === 0) {
        return res.json({ 
            response: `Soy el Experto de **${enrollment.course.title}**. Actualmente el profesor no ha subido material técnico a este curso, por lo que no puedo responder preguntas basándome en una fuente autorizada. Por favor, solicita al docente que suba los documentos del curso.` 
        });
    }

    // Paso 2: Scoring Híbrido (Keyword 40% + Semántico 60%)
    // Ignoramos stopwords comunes en español
    const stopwords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si', 'de', 'del', 'al', 'en', 'por', 'con', 'para', 'como', 'que', 'su', 'sus', 'es', 'son', 'se', 'lo', 'qué', 'cual', 'cuales', 'cómo', 'cuándo', 'dónde']);
    const queryWords = query.toLowerCase()
        .replace(/[¿?¡!.,;:()]/g, '')
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !stopwords.has(w)); 

    // Generar embedding de la pregunta del estudiante (si el modelo de embeddings está disponible)
    const queryEmbedding = await generateEmbedding(query, 'query');
    const hasEmbeddings = queryEmbedding.length > 0;

    const scoredChunks = allChunks.map(chunk => {
        const contentLower = chunk.content.toLowerCase();
        let keywordScore = 0;
        let uniqueMatches = 0;
        
        for (const word of queryWords) {
            const regex = new RegExp(word, 'gi');
            const matches = contentLower.match(regex);
            if (matches) {
                uniqueMatches += 1;
                keywordScore += 10 + (matches.length * 1); 
            }
        }
        keywordScore = keywordScore * Math.pow(2, uniqueMatches);

        // Scoring semántico (similitud coseno contra embedding del chunk)
        let semanticScore = 0;
        if (hasEmbeddings) {
            const chunkEmbedding = JSON.parse(chunk.embedding || '[]');
            if (chunkEmbedding.length > 0) {
                semanticScore = cosineSimilarity(queryEmbedding, chunkEmbedding) * 100;
            }
        }

        // Scoring híbrido: si hay embeddings, 40% keyword + 60% semántico; si no, 100% keyword
        const relevanceScore = hasEmbeddings
            ? (keywordScore * 0.4) + (semanticScore * 0.6)
            : keywordScore;
        
        return { ...chunk, relevanceScore };
    });

    // Paso 3: Filtrar chunks con score 0 y ordenar
    const relevantChunks = scoredChunks.filter(c => c.relevanceScore > 0)
                                     .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Tomar los top hits. Usamos solo 2 para ahorrar tokens drásticamente.
    const TOP_K = 2;
    const topHits = relevantChunks.slice(0, TOP_K);

    // Paso 4: Expansión de Contexto (Context Windowing) Optimizada
    const chunksToInclude = new Map();
    
    const parseChunkMeta = (content: string) => {
        const match = content.match(/\[Doc: (.*?)\]\[Parte (\d+)\/(\d+)\]/);
        if (match) return { doc: match[1], part: parseInt(match[2]), total: parseInt(match[3]) };
        return null;
    };

    for (const hit of topHits) {
        chunksToInclude.set(hit.id, hit);
        const meta = parseChunkMeta(hit.content);
        if (meta) {
            // Solo traemos el siguiente para no gastar demasiados tokens
            const next = allChunks.find(c => c.content.startsWith(`[Doc: ${meta.doc}][Parte ${meta.part + 1}/${meta.total}]`));
            if (next) chunksToInclude.set(next.id, next);
        }
    }

    const finalChunks = Array.from(chunksToInclude.values());
    const MAX_CONTEXT_CHARS = 6000; // Ajustado para modelos 3B locales con ventana de contexto limitada
    
    let contextText = '';
    for (const chunk of finalChunks) {
        if ((contextText.length + chunk.content.length) > MAX_CONTEXT_CHARS) break;
        contextText += chunk.content + '\n\n---\n\n';
    }
    contextText = contextText.trim();
    // ═══════════════════════════════════════════════════════════════

    const hasContext = contextText.length > 20;

    // ═══════════════════════════════════════════════════════════════
    // SYSTEM PROMPT DE "CERO TOLERANCIA" + NEGATIVE PROMPTING
    // ═══════════════════════════════════════════════════════════════
    const systemPrompt = hasContext
        ? `You are a strictly bound assistant. You are the "Experto Virtual de ${enrollment.course.title}", an official academic tutor for this course.

Your knowledge is LIMITED to the provided context chunks below. These chunks come from documents uploaded by the professor to this course.

STRICT INSTRUCTIONS — ZERO TOLERANCE:
1. If the answer to the user's question cannot be inferred from the provided context, you MUST state: "Lo siento, esta información no está presente en los materiales de este curso."
2. DO NOT use your internal knowledge. DO NOT hallucinate. DO NOT offer external explanations.
3. You must ONLY answer based on the CONTEXT provided below. No exceptions.
4. Always cite the source document using the format [Doc: document_name].
5. MANDATORY: Always wrap ALL mathematical expressions in LaTeX delimiters. Use $...$ for inline math and $$...$$ for block/display math. Examples:
   - Instead of "f(x) = sen(x)", write "$f(x) = \\sin(x)$"
   - Instead of "f'(g(x)) * g'(x)", write "$f'(g(x)) \\cdot g'(x)$"
   - Instead of "integral de 0 a 1", write "$\\int_0^1$"
   - Instead of "x^2 + 3x - 5", write "$x^2 + 3x - 5$"
   - Use \\frac{a}{b} for fractions, \\sqrt{x} for roots, \\sum, \\prod, \\lim, etc.
   NEVER write math formulas as plain text. Every variable, equation, and expression must be in $ delimiters.
6. Respond in Spanish, in a clear and pedagogical manner.

═══ EXPLICIT PROHIBITIONS (NEGATIVE PROMPTING) ═══
- NO respondas sobre temas fuera del temario del curso.
- NO menciones que eres una IA entrenada por OpenAI, Google, Meta, Groq, ni ninguna otra empresa.
- NO inventes hechos, datos, fórmulas, definiciones o explicaciones si la información es insuficiente en el contexto.
- NO uses frases como "según mi conocimiento", "en general se sabe que", "normalmente", ni ninguna que implique conocimiento externo.
- NO ofrezcas información complementaria que no esté en el contexto proporcionado.
- NO especules ni hagas suposiciones sobre temas que no están en los documentos.
- Si te piden algo fuera del ámbito académico del curso, rechaza cortésmente diciendo: "Mi función es exclusivamente ayudarte con el contenido del curso ${enrollment.course.title}."
═══════════════════════════════════════════════════

[CONTEXTO DEL CURSO — Documentos autorizados del profesor]:
${contextText}

[FIN DEL CONTEXTO — Cualquier información fuera de este bloque NO debe ser utilizada.]`
        : `Eres el "Experto Virtual de ${enrollment.course.title}".
El usuario te ha dicho: "${query}".
Dado que su mensaje no incluye palabras clave que hagan match con los documentos del curso (o simplemente te está saludando), responde de manera amigable.
Si es un saludo, devuélvelo cortésmente e invítalo a hacerte preguntas específicas sobre el material de estudio.
Si te está haciendo una pregunta técnica, dile: "Lo siento, esta información no está presente en los materiales de este curso."
NO respondas preguntas de contenido académico basándote en tu conocimiento interno. Siempre redirige al material del curso.`;

    // ═══════════════════════════════════════════════════════════════
    // INFERENCIA LOCAL VÍA LM STUDIO (con cola anti-saturación)
    // ═══════════════════════════════════════════════════════════════
    console.log(`🧠 Cola AI: pendientes=${aiQueue.pending}, activas=${aiQueue.size}`);
    const chatCompletion = await aiQueue.add(async () => {
        return lmStudio.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            model: process.env.LM_STUDIO_CHAT_MODEL || 'qwen2.5-3b-instruct',
            temperature: 0.1,
            max_tokens: 1024,
            top_p: 0.9,
        });
    });

        const responseText = chatCompletion?.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
        res.json({ response: responseText });
    } catch (error: any) {
        console.error("Error AI (LM Studio):", error.message);
        let humanError = "Lo sentimos, el servidor experimentó un problema al conectarse con el modelo local.";
        if (error.message && error.message.includes('ECONNREFUSED')) {
            humanError = "⛔ No se pudo conectar con LM Studio. Asegúrate de que LM Studio esté ejecutándose con el servidor local activo en el puerto configurado.";
        } else if (error.message && error.message.includes('timeout')) {
            humanError = "⏳ La petición excedió el tiempo límite. El modelo local puede estar saturado. Intenta de nuevo en unos segundos.";
        } else {
            humanError += " " + error.message;
        }
        res.status(500).json({ error: humanError });
    }
});

// 7. Estado de la cola de IA (para feedback de UX en el frontend)
app.get('/api/ai/queue-status', (req, res) => {
    res.json({
        pending: aiQueue.pending,   // Peticiones en espera
        active: aiQueue.size,       // Peticiones procesándose ahora
        concurrency: aiQueue.concurrency,
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
    console.log(`🤖 Conectando a LM Studio en: ${process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1'}`);
    console.log(`📊 Modelo de chat: ${process.env.LM_STUDIO_CHAT_MODEL || 'qwen2.5-3b-instruct'}`);
    console.log(`📐 Modelo de embeddings: ${process.env.LM_STUDIO_EMBED_MODEL || 'nomic-embed-text-v1.5'}`);
});
