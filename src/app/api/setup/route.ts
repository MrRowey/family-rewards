import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const existingConfig = await prisma.familyConfig.findFirst();

    if (existingConfig?.isConfigured) {
      return NextResponse.json(
        { error: "System is already configured. Access forbidden." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (typeof pin !== "string" || !/^\d{4,8}\$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be between 4 and 8 digits." },
        { status: 400 }
      );
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    if (existingConfig) {
      await prisma.familyConfig.update({
        where: { id: existingConfig.id },
        data: {
          parentPin: hashedPin,
          isConfigured: true,
        },
      });
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