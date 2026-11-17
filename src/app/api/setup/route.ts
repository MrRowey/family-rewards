import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const existingConfig = await prisma.familyConfig.findFirst();

    if (existingConfig?.isConfigured || existingConfig?.parentPin) {
      return NextResponse.json(
        { error: "System is already configured. Access forbidden." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be between 4 and 8 digits." },
        { status: 400 }
      );
    }

    const hashedPin = await hash(pin, 10);

    if (existingConfig) {
      const result = await prisma.familyConfig.updateMany({
        where: { id: existingConfig.id, isConfigured: false, parentPin: null },
        data: { parentPin: hashedPin, isConfigured: true },
      });
      if (result.count !== 1) return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
    } else {
      await prisma.familyConfig.create({
        data: {
          parentPin: hashedPin,
          isConfigured: true,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setup API Error:", error);
    return NextResponse.json(
      { error: "Failed to save configuration." },
      { status: 500 }
    );
  }
}