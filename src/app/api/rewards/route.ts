import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public kiosk results are restricted server-side; parent dashboard uses /api/parent/rewards.
export async function GET(req: Request) {
  try {
    const { searchParams, pathname } = new URL(req.url);
    const parentView = pathname === "/api/parent/rewards";
    const childId = searchParams.get("childId");
    const month = searchParams.get("month");
    const parsedMonth = month === null ? null : Number(month);
    if (parsedMonth !== null && (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const rewards = await prisma.reward.findMany({
      where: parentView
        ? (parsedMonth !== null ? { targetMonth: parsedMonth } : {})
        : {
            isVisible: true,
            isGroup: false,
            currentStock: { gt: 0 },
            OR: [{ targetMonth: null }, { targetMonth: new Date().getMonth() + 1 }],
          },
      include: { assignments: true },
    });

    if (childId) {
      return NextResponse.json(rewards.filter((r) =>
        parentView
          ? r.assignments.some((a) => a.childId === childId)
          : r.assignments.length === 0 || r.assignments.some((a) => a.childId === childId)
      ));
    }
    return NextResponse.json(rewards);
  } catch {
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}
