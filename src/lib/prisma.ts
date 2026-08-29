import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enable SQLite Write-Ahead Logging (WAL) for concurrency
async function enableWAL() {
  try {
    await prisma.$executeRawUnsafe(`PRAGMA journal_mode = WAL;`);
    await prisma.$executeRawUnsafe(`PRAGMA synchronous = NORMAL;`);
  } catch (e) {
    // WAL mode fails gracefully on first-time initialization before DB file exists
  }
}

enableWAL();