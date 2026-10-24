import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");
    const month = searchParams.get("month");

    const rewards = await prisma.reward.findMany({
      where: month ? { targetMonth: parseInt(month, 10) } : undefined,
      include: {
        assignments: true,
      },
    });

    if (childId) {
      const filtered = rewards.filter((r: { assignments: Array<{ childId: string }> }) => {
        return r.assignments.some((a: { childId: string }) => a.childId === childId);
      });
      return NextResponse.json(filtered);
    }

    return NextResponse.json(rewards);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}