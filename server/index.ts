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

// 3. Recursos (Docentes suben, Estudiantes ven)
app.get('/api/resources', async (req, res) => {
    const resources = await prisma.resource.findMany({ include: { teacher: true } });
    res.json(resources);
});

app.post('/api/resources', async (req, res) => {
    const { title, description, url, type, teacherId } = req.body;
    try {
        const resource = await prisma.resource.create({
            data: { title, description, url, type, teacherId }
        });
        res.json(resource);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear recurso' });
    }
});

// 4. Mochila Virtual (Estudiante guarda recursos)
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
    } catch (error) {
        res.status(400).json({ error: 'Error al guardar (ya está en la mochila o IDs inválidos)' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});
