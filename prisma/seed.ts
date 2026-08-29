import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.completion.deleteMany();
    await prisma.subStep.deleteMany();
    await prisma.task.deleteMany();
    await prisma.child.deleteMany();

    const now = new Date();

    // Archie: Age 6
    const archieDob = new Date();
    