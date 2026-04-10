import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import 'dotenv/config';
import Groq from 'groq-sdk';

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

        await Promise.all(chunks.map((chunk, idx) =>
            prisma.documentChunk.create({
                data: {
                    content: `[Doc: ${title}][Parte ${idx + 1}/${chunks.length}] ${chunk}`,
                    embedding: JSON.stringify([]),
                    courseId: resource.session.courseId,
                    resourceId: resource.id
                }
            })
        ));
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

// 6. RAG AI Experto (Aislamiento Multi-Tenant)
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

    // Aislamiento: Recuperación estricta (Retrieval)
    const relevantChunks = await prisma.documentChunk.findMany({
        where: { courseId: courseId },
        take: 10
    });

    if (relevantChunks.length === 0) {
        return res.json({ 
            response: `Soy el Experto de ${enrollment.course.title}. Actualmente el profesor no ha subido material técnico a este módulo, por lo que no puedo responder preguntas basándome en una fuente autorizada.` 
        });
    }

    const contextText = relevantChunks.map(c => c.content).join('\n\n');

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        const hasContext = contextText.trim().length > 20;

        const systemPrompt = hasContext
            ? `Eres el "Experto Virtual de ${enrollment.course.title}", un tutor académico oficial de este curso.

INSTRUCCIONES ESTRICTAS:
1. SOLO puedes responder basándote en el CONTEXTO DEL CURSO proporcionado a continuación. Ese contexto proviene de los documentos que el profesor subió a esta materia.
2. Si la respuesta a la pregunta NO está en el contexto, di exactamente: "Esta información no está en el material cargado por el profesor para este curso."
3. NO uses conocimiento externo ni general, aunque lo sepas. Solo el contexto.
4. Cita siempre la parte del documento de donde sacas la información con [Doc: nombre].
5. Usa notación LaTeX para fórmulas: $formula$ (inline) o $$formula$$ (bloque).
6. Si te preguntan algo fuera del ámbito académico, rechaza cortésmente.

[CONTEXTO DEL CURSO - Documentos del profesor]:
${contextText}`
            : `Eres el "Experto Virtual de ${enrollment.course.title}".
El profesor aún no ha subido material a este módulo. Comunícalo amablemente al estudiante e indícale que puede preguntar al docente que suba los documentos del curso para activar el asistente especializado.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: query }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 4096,
        });

        const responseText = chatCompletion.choices[0]?.message?.content || 'No se pudo generar una respuesta.';
        res.json({ response: responseText });
    } catch (error: any) {
        console.error("Error AI API:", error.message);
        let humanError = "Lo sentimos, el servidor experimentó un problema al conectarse con el experto. " + error.message;
        if (error.message && (error.message.includes("401") || error.message.includes("invalid_api_key") || error.message.includes("API key"))) {
            humanError = "⛔ API Key de Groq inválida. Verifica la clave en console.groq.com";
        } else if (error.message && (error.message.includes("429") || error.message.includes("rate_limit"))) {
            humanError = "⏳ Se ha alcanzado el límite de solicitudes de Groq por minuto. Espera unos segundos e intenta de nuevo.";
        }
        res.status(500).json({ error: humanError });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);

});
