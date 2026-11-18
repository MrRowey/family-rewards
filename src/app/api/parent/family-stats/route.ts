import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    const childId = query.get("childId") || undefined;
    const days = Number(query.get("days") ?? 30);
    if (![7, 30, 90].includes(days)) {
      return NextResponse.json({ error: "Choose a 7, 30, or 90 day range." }, { status: 400 });
    }

    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days + 1));
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
    const [completions, redemptions] = await Promise.all([
      prisma.completion.groupBy({
        by: ["forDate"],
        where: { childId, status: "APPROVED", forDate: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      prisma.rewardRedemption.findMany({
        where: { childId, status: "APPROVED", requestedAt: { gte: start, lt: end } },
        select: { requestedAt: true, starCostAtClaim: true },
      }),
    ]);

    const rows = Array.from({ length: days }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return { date: date.toISOString().slice(0, 10), chores: 0, prizes: 0, starsSpent: 0, missingPrices: 0 };
    });
    const byDate = new Map(rows.map((row) => [row.date, row]));
    for (const { forDate, _count: { _all: count } } of completions) {
      const row = byDate.get(forDate.toISOString().slice(0, 10));
      if (row) row.chores = count;
    }
    for (const redemption of redemptions) {
      const row = byDate.get(redemption.requestedAt.toISOString().slice(0, 10));
      if (!row) continue;
      row.prizes++;
      if (redemption.starCostAtClaim === null) row.missingPrices++;
      else row.starsSpent += redemption.starCostAtClaim;
    }
    return NextResponse.json(rows);
  } catch (error) {
    return apiError(error, "Could not load family trends.");
  }
}
