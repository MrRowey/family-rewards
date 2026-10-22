import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    // Clean existing operational data
    await prisma.rewardRedemption.deleteMany();
    await prisma.rewardAssignment.deleteMany();
    await prisma.groupRewardPledge.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.completion.deleteMany();
    await prisma.subStep.deleteMany();
    await prisma.task.deleteMany();
    await prisma.child.deleteMany();

    // Default System Config
    await prisma.familyConfig.upsert({
        where: { id: "default" },
        update: {},
        create: {
            id: "default",
            parentPin: "1234", // Default parent PIN
        },
    });

    // Seed Rewards from JSON
    const rewardsPath = path.join(__dirname, "data", "rewards.json");

    if (fs.existsSync(rewardsPath)) {
        const rawData = fs.readFileSync(rewardsPath, "utf-8");
        const rewards = JSON.parse(rawData);

        for (const reward of rewards) {
            await prisma.reward.create({
                data: reward,
            });
        }
        console.log(`🎁 Seeded ${rewards.length} predefined rewards from rewards.json!`);
    } else {
        console.warn(`⚠️ rewards.json not found at ${rewardsPath}. Skipping reward seed.`);
    }

    console.log("✅ Database initialized successfully with clean system configuration!");
    console.log("👉 First boot complete: Please visit the Parent Portal (/parent) to add children and tasks.");
}

main()
    .catch((e) => {
        console.error("❌ Seed Failed: ", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });