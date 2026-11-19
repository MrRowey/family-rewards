import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";

const id = z.string().uuid();

export async function GET(request: Request) {
  try {
    const child = id.safeParse(new URL(request.url).searchParams.get("childId"));
    if (!child.success) return NextResponse.json({ error: "Select a child." }, { status: 400 });
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

export async function POST(request: Request) {
  try {
    const { childId, redemptionId } = await parseJson(request, z.object({ childId: id, redemptionId: id }));
    const result = await prisma.rewardRedemption.updateMany({
      where: { id: redemptionId, childId, status: "APPROVED", refundState: null },
      data: { refundState: "PENDING" },
    });
    if (!result.count) return NextResponse.json({ error: "This prize cannot be requested for refund." }, { status: 409 });
    return NextResponse.json({ refundState: "PENDING" });
  } catch (error) {
    return apiError(error, "Could not request a refund.");
  }
}
