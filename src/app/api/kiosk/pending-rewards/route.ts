import { isAuthorisedForChild } from "@/lib/kiosk-session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return NextResponse.json({ error: "Select a child" }, { status: 400 });
    if (childId && !(await isAuthorisedForChild(childId))) return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    const pending = await prisma.rewardRedemption.findMany({
      where: { status: "PENDING", childId },
      select: { id: true, childId: true, rewardId: true },
    });
    return NextResponse.json(pending.map((r) => ({
      id: r.id, child: { id: r.childId }, reward: { id: r.rewardId },
    })));
  } catch {
    return NextResponse.json({ error: "Failed to fetch pending claims" }, { status: 500 });
  }
}
