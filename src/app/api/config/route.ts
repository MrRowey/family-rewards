import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const config = await prisma.familyConfig.findFirst();
    if (!config) {
      return NextResponse.json({ isConfigured: false });
    }

    // Strip parentPin from GET response so it never reaches browser network logs
    const { parentPin, ...safeConfig } = config;
    return NextResponse.json({
      ...safeConfig,
      isConfigured: true,
      hasPin: Boolean(parentPin),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { parentPin, ...otherSettings } = body;

    let hashedPin: string | undefined = undefined;
    if (parentPin) {
      hashedPin = await bcrypt.hash(parentPin, 10);
    }

    const existing = await prisma.familyConfig.findFirst();

    if (existing) {
      const updated = await prisma.familyConfig.update({
        where: { id: existing.id },
        data: {
          ...otherSettings,
          ...(hashedPin && { parentPin: hashedPin }),
        },
      });
      const { parentPin: _, ...safeUpdated } = updated;
      return NextResponse.json(safeUpdated);
    }

    const created = await prisma.familyConfig.create({
      data: {
        ...otherSettings,
        parentPin: hashedPin,
      },
    });
    const { parentPin: _, ...safeCreated } = created;
    return NextResponse.json(safeCreated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}