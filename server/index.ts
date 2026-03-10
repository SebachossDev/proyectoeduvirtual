import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// 1. Auth Login (Sin tokens complejos, solo verificar credenciales simples para este MVP)
app.post('/api/login', async (req, res) => {
    const { code, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { code } });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// 2. Usuarios (Solo ADMIN)
app.get('/api/users', async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.post('/api/users', async (req, res) => {
    const { name, code, password, role } = req.body;
    try {
        const user = await prisma.user.create({
            data: { name, code, password, role }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear usuario (quizá el código ya existe)' });
    }
});

// 3. Cursos (Moodle)
app.get('/api/courses', async (req, res) => {
    // Para simplificar MVP, devolvemos todo. En real filtraríamos por teacherId.
    const courses = await prisma.course.findMany({ include: { teacher: true, sessions: { include: { resources: true } } } });
    res.json(courses);
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
            data: { title, description, url, type, sessionId }
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
