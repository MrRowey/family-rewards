import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.completion.deleteMany();
    await prisma.subStep.deleteMany();
    await prisma.task.deleteMany();
    await prisma.child.deleteMany();

    await prisma.familyConfig.upsert({
        where: { id: "default" },
        update: {},

        create: {
            id: "default",
            parentPin: "1234", // Default parent PIN
        },
    });

    console.log("✅ Database initialized successfully with clean system configuration!");
    console.log("👉 First boot complete: Please visit the Parent Portal (/parent) to add children and tasks.");
}

main()
    .catch((e) => {
        console.error(" Seed Failed: ", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
