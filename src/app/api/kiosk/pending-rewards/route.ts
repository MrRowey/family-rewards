import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pending = await prisma.rewardRedemption.findMany({
      where: { status: "PENDING" },
      select: { id: true, childId: true, rewardId: true },
    });
    return NextResponse.json(pending.map((r) => ({
      id: r.id, child: { id: r.childId }, reward: { id: r.rewardId },
    })));
  } catch {
    return NextResponse.json({ error: "Failed to fetch pending claims" }, { status: 500 });
  }
}
