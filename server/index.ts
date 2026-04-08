import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

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

app.post('/api/resources', async (req, res) => {
    const { title, description, url, type, sessionId } = req.body;
    try {
        const resource = await prisma.resource.create({
            data: { title, description, url, type, sessionId },
            include: { session: true } // Need session to know which course this belongs to
        });

        // EMITIR EVENTO EN TIEMPO REAL (SSE) a los estudiantes
        sendEventToClients({
            type: 'NEW_RESOURCE',
            payload: {
                resource,
                courseId: resource.session.courseId
            }
        });

        res.json(resource);
    } catch (error: any) {
        console.error("POST /api/resources ERROR:", error);
        res.status(400).json({ error: error.message || 'Error al crear recurso' });
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

// 5. Mochila Virtual (Estudiante guarda recursos)
app.get('/api/backpack/:studentId', async (req, res) => {
    const { studentId } = req.params;
    const items = await prisma.backpackItem.findMany({
        where: { studentId },
        include: { resource: true }
    });
    res.json(items);
});

app.post('/api/backpack', async (req, res) => {
    const { studentId, resourceId } = req.body;
    try {
        const item = await prisma.backpackItem.create({
            data: { studentId, resourceId }
        });
        res.json(item);
    } catch (error: any) {
        res.status(400).json({ error: 'Error al guardar (ya está en la mochila o IDs inválidos)' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});
