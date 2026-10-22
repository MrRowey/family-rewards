import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
    },
    database: { status: "unknown", latencyMs: 0 },
    config: { status: "unknown", isConfigured: false },
  };

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database.latencyMs = Date.now() - dbStart;
    checks.database.status = "connected";

    const config = await prisma.familyConfig.findFirst();
    checks.config.status = "ok";
    checks.config.isConfigured = config?.isConfigured ?? false;
  } catch (error: any) {
    checks.database.status = "error";
    checks.database.error = error?.message || String(error);
  }

  const totalDuration = Date.now() - startTime;
  const isHealthy = checks.database.status === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "OK" : "ERROR",
      totalLatencyMs: totalDuration,
      checks,
    },
    { status: isHealthy ? 200 : 500 }
  );
}