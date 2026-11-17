import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimReward } from "@/lib/domain/redemptions";

// GET /api/redemptions -> Fetch reward redemptions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const status = searchParams.get("status");

    const redemptions = await prisma.rewardRedemption.findMany({
      where: {
        ...(childId && { childId }),
        ...(status && { status }),
      },
      include: {
        reward: true,
        child: true,
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json(redemptions);
  } catch (error) {
    console.error("GET Redemptions Error:", error);
    return NextResponse.json({ error: "Failed to fetch redemptions" }, { status: 500 });
  }
}

// Legacy endpoint uses the same transactional service as /api/rewards/claim.
export async function POST(request: Request) {
  try {
    const { childId, rewardId } = await request.json();
    if (typeof childId !== "string" || typeof rewardId !== "string" || !childId || !rewardId) {
      return NextResponse.json({ error: "Child ID and Reward ID are required" }, { status: 400 });
    }
    const redemption = await claimReward(childId, rewardId);
    return NextResponse.json(redemption, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request reward";
    const status = message.startsWith("NOT_FOUND") ? 404 : /^(INSUFFICIENT_STARS|OUT_OF_STOCK)/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
