import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.familyConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      parentPin: null,
      isConfigured: false,
    },
  });

  console.log("✅ Seed complete: Unconfigured family initialized; parent PIN must be set during setup.");
}

main()
  .catch((e) => {
    console.error("❌ Seed Failed: ", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });