import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.familyConfig.findFirst();
    return NextResponse.json({ idleTimeoutSec: config?.idleTimeoutSec ?? 45, soundEffects: config?.soundEffects ?? true, maxDailyTasks: config?.maxDailyTasks ?? 5 });
  } catch (error) {
    console.error("Failed to load kiosk config:", error);
    return NextResponse.json({ error: "Failed to load config" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    let config = await prisma.familyConfig.findFirst();
    if (!config) {
      config = await prisma.familyConfig.create({
        data: {
          isConfigured: false,
          idleTimeoutSec: 45,
          soundEffects: true,
          maxDailyTasks: 5,
        },
      });
    }

    const updated = await prisma.familyConfig.update({
      where: { id: config.id },
      data: {
        idleTimeoutSec: body.idleTimeoutSec !== undefined ? Number(body.idleTimeoutSec) : config.idleTimeoutSec,
        soundEffects: body.soundEffects !== undefined ? Boolean(body.soundEffects) : config.soundEffects,
        maxDailyTasks: body.maxDailyTasks !== undefined ? Number(body.maxDailyTasks) : config.maxDailyTasks,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "UPDATED_KIOSK_CONFIG",
        details: `Updated kiosk settings (timeout: ${updated.idleTimeoutSec}s, sfx: ${updated.soundEffects})`,
      },
    });

    return NextResponse.json({ idleTimeoutSec: updated.idleTimeoutSec, soundEffects: updated.soundEffects, maxDailyTasks: updated.maxDailyTasks });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}