import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { newPin } = await req.json();
    if (!newPin || String(newPin).length < 4) {
      return NextResponse.json({ error: "PIN must be at least 4 digits" }, { status: 400 });
    }

    const config = await prisma.familyConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: "System config not found" }, { status: 404 });
    }

    await prisma.familyConfig.update({
      where: { id: config.id },
      data: { parentPin: String(newPin) },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "RESET_PIN",
        details: "Parent security PIN was successfully changed",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reset PIN:", error);
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}