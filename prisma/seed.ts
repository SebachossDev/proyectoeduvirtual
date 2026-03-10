import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Limpiar base de datos (por si acaso usamos el script manual)
    await prisma.backpackItem.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.session.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    // 2. Crear Usuarios Básicos
    const admin = await prisma.user.create({
        data: { name: 'Administrador Principal', code: 'A123', password: 'admin', role: 'ADMIN' }
    });

    const teacher = await prisma.user.create({
        data: { name: 'Profesor Moodle', code: 'D123', password: 'admin', role: 'TEACHER' }
    });

    const student1 = await prisma.user.create({
        data: { name: 'Estudiante Prueba 1', code: 'E123', password: 'admin', role: 'STUDENT' }
    });

    const student2 = await prisma.user.create({
        data: { name: 'Estudiante Prueba 2', code: 'E456', password: 'admin', role: 'STUDENT' }
    });

    // 3. Crear Curso para el Profesor
    const course = await prisma.course.create({
        data: {
            title: 'Desarrollo Web Fullstack',
            description: 'Curso intensivo de MERN y TypeScript',
            teacherId: teacher.id
        }
    });

    // 4. Inscribir Estudiantes (Moodle Enrollment)
    await prisma.enrollment.createMany({
        data: [
            { studentId: student1.id, courseId: course.id, grade: 85.5 },
            { studentId: student2.id, courseId: course.id, grade: null } // Aún sin calificar
        ]
    });

    // 5. Crear Sesiones (Módulos/Semanas)
    const session1 = await prisma.session.create({
        data: { title: 'General', courseId: course.id, order: 0 }
    });

    const session2 = await prisma.session.create({
        data: { title: 'Semana 1: Introducción a React', courseId: course.id, order: 1 }
    });

    // 6. Crear Recursos Clásicos en las sesiones
    await prisma.resource.create({
        data: { title: 'Sílabo del Curso', url: 'silabo.pdf', type: 'PDF', sessionId: session1.id }
    });

    await prisma.resource.create({
        data: { title: 'Hooks de React', url: 'https://react.dev/reference/react', type: 'LINK', sessionId: session2.id }
    });

    console.log('✅ Base de datos sembrada con éxito con estructura Moodle (Cursos, Sesiones, Inscripciones)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
