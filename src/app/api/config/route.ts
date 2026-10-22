import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.familyConfig.findFirst();

    return NextResponse.json({
      isConfigured: config?.isConfigured ?? false,
      maxDailyTasks: config?.maxDailyTasks ?? 5,
    });
  } catch (error) {
    console.error("Config check error:", error);
    return NextResponse.json({ isConfigured: false }, { status: 500 });
  }
}