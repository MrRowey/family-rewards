import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultHashedPin = await bcrypt.hash("1234", 10);

  await prisma.familyConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      parentPin: defaultHashedPin,
      isConfigured: false,
    },
  });

  console.log("✅ Seed complete: Default configuration initialized safely.");
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