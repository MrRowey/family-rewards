import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const children = await prisma.child.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        stars: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(children);
  } catch {
    return NextResponse.json({ error: "Failed to fetch kiosk children" }, { status: 500 });
  }
}