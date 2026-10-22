import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const startTime = Date.now();

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - dbStart;

    // Production response: Clean & secure
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // Development / Diagnostic response
    const config = await prisma.familyConfig.findFirst();

    return NextResponse.json({
      status: "OK",
      totalLatencyMs: Date.now() - startTime,
      checks: {
        timestamp: new Date().toISOString(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL_SET: !!process.env.DATABASE_URL,
          JWT_SECRET_SET: !!process.env.JWT_SECRET,
        },
        database: { status: "connected", latencyMs },
        config: { status: "ok", isConfigured: config?.isConfigured ?? false },
      },
    });
  } catch (error: unknown) {
    console.error("Health Check Error:", error);

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ status: "error" }, { status: 500 });
    }

    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        status: "ERROR",
        totalLatencyMs: Date.now() - startTime,
        error: message,
      },
      { status: 500 }
    );
  }
}