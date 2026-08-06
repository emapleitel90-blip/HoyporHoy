import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Sembrando base de datos...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // 1. Crear Usuario Super Admin (SaaS Owner)
    const superAdmin = await prisma.user.upsert({
        where: { email: 'sysadmin@lyp.com' },
        update: {},
        create: {
            email: 'sysadmin@lyp.com',
            name: 'Propietario LyP (SaaS)',
            password: hashedPassword,
            role: 'SUPER_ADMIN',
        },
    });

    // 2. Crear un Estudio por Defecto (LyP Demo)
    const studio = await prisma.studio.upsert({
        where: { id: "1" },
        update: {},
        create: {
            id: "1",
            name: 'Estudio Jurídico LyP',
            cuit: '20-12345678-9',
            address: 'Calle Falsa 123',
            status: 'ACTIVE',
        },
    });

    // 3. Crear Usuario Admin (Admin de Estudio LyP)
    const admin = await prisma.user.upsert({
        where: { email: 'admin@lyp.com' },
        update: {},
        create: {
            email: 'admin@lyp.com',
            name: 'Administrador de Estudio',
            password: hashedPassword,
            role: 'ADMIN',
            studioId: studio.id
        },
    });

    // 4. Crear Cliente Demo
    const demoClient = await prisma.client.create({
        data: {
            firstName: 'Cliente',
            lastName: 'Demo',
            documentId: '20-11111111-2',
            email: 'cliente@demo.com',
            studioId: studio.id
        }
    });

    // 5. Crear un Caso Inicial
    await prisma.case.upsert({
        where: { caseNumber: 'EXP-001' },
        update: {
            clientId: demoClient.id
        },
        create: {
            caseNumber: 'EXP-001',
            title: 'Caso de Prueba Inicial',
            description: 'Este es un caso generado automáticamente para validar el sistema.',
            status: 'OPEN',
            priority: 'MEDIUM',
            studioId: studio.id,
            createdById: admin.id,
            clientId: demoClient.id
        }
    });

    console.log('✅ Base de datos sembrada con éxito (SuperAdmin, Estudio LyP, Admin y Caso Inicial).');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });