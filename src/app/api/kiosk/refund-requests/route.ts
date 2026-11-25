import { isAuthorisedForChild } from "@/lib/kiosk-session";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

const id = z.string().uuid();

export async function GET(request: Request) {
  try {
    const child = id.safeParse(new URL(request.url).searchParams.get("childId"));
    if (!child.success) return NextResponse.json({ error: "Select a child." }, { status: 400 });
    if (!(await isAuthorisedForChild(child.data))) return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    const items = await prisma.rewardRedemption.findMany({
      where: { childId: child.data, status: { in: ["APPROVED", "REFUNDED"] } },
      select: { id: true, status: true, refundState: true, reward: { select: { title: true } } },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
    return NextResponse.json(items);
  } catch (error) {
    return apiError(error, "Could not load redeemed prizes.");
  }
}

// Refund execution is deferred to 27.01.0. Do not enable without regression tests.
export async function POST() {
  return NextResponse.json({ error: "Refunds are not available in this release." }, { status: 403 });
}
