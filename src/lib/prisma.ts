import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log:
    process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Self-executing server check on ininal load

if (typeof window == "undefined") {
  prisma
    .$connect()
    .then(() => {
      console.log("✅ [DIAGNOSTICS] PostgreSQL Database Connected Successfully!");
    })
    .catch((err) => {
      console.error("❌ [DIAGNOSTICS] PostgreSQL Connection Error:", err.message);
    });
}