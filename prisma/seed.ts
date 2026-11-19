import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { compare } from "bcryptjs";

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

  // Repair legacy installations seeded with the former known PIN, but never configured.
  // Never overwrite a PIN belonging to a completed setup or a user-selected PIN.
  const unconfigured = await prisma.familyConfig.findMany({
    where: { isConfigured: false, parentPin: { not: null } },
    select: { id: true, parentPin: true },
  });

  let repaired = 0;
  for (const config of unconfigured) {
    if (!config.parentPin || !(await compare("1234", config.parentPin))) continue;

    const result = await prisma.familyConfig.updateMany({
      where: { id: config.id, isConfigured: false, parentPin: config.parentPin },
      data: { parentPin: null },
    });
    repaired += result.count;
  }

  console.log(`Seed complete: no default PIN; cleared ${repaired} legacy unconfigured PIN(s). Parent PIN must be set during setup.`);
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