import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Asegurarnos de que existe el Admin por defecto
    const adminCode = 'A123';
    const existingAdmin = await prisma.user.findUnique({ where: { code: adminCode } });

    if (!existingAdmin) {
        await prisma.user.create({
            data: {
                name: 'Administrador Principal',
                code: adminCode,
                password: 'admin', // En un entorno real se encriptaría con bcrypt
                role: 'ADMIN',
            },
        });
        console.log('✅ Usuario ADMIN creado: A123 / admin');
    } else {
        console.log('⚡ El usuario ADMIN ya existe.');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
