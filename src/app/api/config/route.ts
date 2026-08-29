import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/config -> Fetch configuration
export async function GET() {
  try {
    let config = await prisma.familyConfig.findFirst();
    if (!config) {
      config = await prisma.familyConfig.create({
        data: {
          id: "default",
          parentPin: "1234",
          isConfigured: false,
          maxDailyTasks: 5,
        },
      });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("GET Config Error:", error);
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

// POST /api/config -> Save PIN and mark setup complete
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentPin, isConfigured, maxDailyTasks } = body;

    // Check if default config exists
    const existing = await prisma.familyConfig.findFirst();

    let updated;
    if (existing) {
      updated = await prisma.familyConfig.update({
        where: { id: existing.id },
        data: {
          parentPin: parentPin || existing.parentPin,
          isConfigured: isConfigured !== undefined ? Boolean(isConfigured) : existing.isConfigured,
          maxDailyTasks: maxDailyTasks ? Number(maxDailyTasks) : existing.maxDailyTasks,
        },
      });
    } else {
      updated = await prisma.familyConfig.create({
        data: {
          id: "default",
          parentPin: parentPin || "1234",
          isConfigured: isConfigured !== undefined ? Boolean(isConfigured) : true,
          maxDailyTasks: maxDailyTasks ? Number(maxDailyTasks) : 5,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST Config Error:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}