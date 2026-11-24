import { isAuthorisedForChild } from "@/lib/kiosk-session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public kiosk results are restricted server-side; parent dashboard uses /api/parent/rewards.
export async function GET(req: Request) {
  try {
    const { searchParams, pathname } = new URL(req.url);
    const parentView = pathname === "/api/parent/rewards";
    const childId = searchParams.get("childId");
    if (!parentView && childId && !(await isAuthorisedForChild(childId))) return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    const month = searchParams.get("month");
    const parsedMonth = month === null ? null : Number(month);
    if (parsedMonth !== null && (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const today = new Date();
    const plan = !parentView && childId ? await prisma.shopPlan.findUnique({
      where: { childId_year_month: { childId, year: today.getFullYear(), month: today.getMonth() + 1 } },
    }) : null;

    const rewards = await prisma.reward.findMany({
      where: parentView
        ? (parsedMonth !== null ? { OR: [{ targetMonth: null }, { targetMonth: parsedMonth }] } : {})
        : {
            ...(plan ? { id: { in: plan.rewardIds } } : { isVisible: true }),
            isGroup: false,
            isArchived: false,
            currentStock: { gt: 0 },
            OR: [{ targetMonth: null }, { targetMonth: today.getMonth() + 1 }],
          },
      include: { assignments: true },
    });

    if (parentView) {
      return NextResponse.json(childId
        ? rewards.filter((r) => r.assignments.some((a) => a.childId === childId))
        : rewards);
    }

    // Public clients need only assignment eligibility, not other children's IDs.
    // Unassigned rewards are available to every child.
    return NextResponse.json(rewards
      .filter((r) => plan ? plan.rewardIds.includes(r.id) : r.assignments.length === 0 || (childId !== null && r.assignments.some((a) => a.childId === childId)))
      .map((r) => ({
        ...r,
        assignments: childId && r.assignments.some((a) => a.childId === childId)
          ? [{ childId }]
          : [],
      })));
  } catch {
    return NextResponse.json({ error: "Failed to fetch rewards" }, { status: 500 });
  }
}
