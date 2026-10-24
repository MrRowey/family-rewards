import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { childId, amount, reason } = await req.json();

    if (!childId || amount === undefined || !reason) {
      return NextResponse.json(
        { error: "Child ID, amount, and reason are required" },
        { status: 400 }
      );
    }

    const child = await prisma.child.findUnique({ where: { id: childId } });
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const newStars = Math.max(0, child.stars + Number(amount));

    const updated = await prisma.child.update({
      where: { id: childId },
      data: { stars: newStars },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "ADJUSTED_STARS",
        details: `Adjusted stars for ${child.name} by ${
          Number(amount) > 0 ? `+${amount}` : amount
        } (${reason}). New balance: ${newStars}`,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to adjust stars:", error);
    return NextResponse.json({ error: "Failed to adjust stars" }, { status: 500 });
  }
}