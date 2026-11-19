import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { newPin } = await req.json();
    if (typeof newPin !== "string" || !/^\d{4,8}$/.test(newPin)) {
      return NextResponse.json({ error: "PIN must be between 4 and 8 digits" }, { status: 400 });
    }

    const config = await prisma.familyConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: "System config not found" }, { status: 404 });
    }

    await prisma.familyConfig.update({
      where: { id: config.id },
      data: { parentPin: await hash(newPin, 12), parentPinLength: newPin.length },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "RESET_PIN",
        details: "Parent security PIN was successfully changed",
      },
    });

    const response = NextResponse.json({ success: true, requiresLogin: true });
    response.cookies.set("parent_session", "", { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Failed to reset PIN:", error);
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}