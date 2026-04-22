import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const chunks = await prisma.documentChunk.groupBy({
    by: ['courseId'],
    _count: { id: true }
  });
  console.log('Chunks by courseId:', chunks);

  const courses = await prisma.course.findMany({
      include: {
          sessions: {
              include: {
                  resources: true
              }
          }
      }
  });
  console.log('Courses:', JSON.stringify(courses.map(c => ({
      id: c.id, 
      title: c.title,
      resources: c.sessions.flatMap(s => s.resources.map(r => ({id: r.id, title: r.title})))
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
