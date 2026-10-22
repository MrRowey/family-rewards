import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

// POST /api/redemptions -> Child requests a reward in the shop
export async function POST(request: Request) {
  try {
    const { childId, rewardId } = await request.json();

    if (!childId || !rewardId) {
      return NextResponse.json({ error: "Child ID and Reward ID are required" }, { status: 400 });
    }

    const [child, reward] = await Promise.all([
      prisma.child.findUnique({ where: { id: childId } }),
      prisma.reward.findUnique({ where: { id: rewardId } }),
    ]);

    if (!child || !reward) {
      return NextResponse.json({ error: "Child or Reward not found" }, { status: 404 });
    }

    if (child.stars < reward.starCost) {
      return NextResponse.json({ error: "Not enough stars" }, { status: 400 });
    }

    // Deduct stars, record redemption, and log action
    const [redemption] = await prisma.$transaction([
      prisma.rewardRedemption.create({
        data: { childId, rewardId, status: "PENDING" },
        include: { reward: true, child: true },
      }),
      prisma.child.update({
        where: { id: childId },
        data: { stars: { decrement: reward.starCost } },
      }),
      prisma.auditLog.create({
        data: {
          actor: child.name,
          actorType: "CHILD",
          action: "REDEEMED_REWARD",
          details: `Requested reward "${reward.title}" for ${reward.starCost} stars.`,
        },
      }),
    ]);

    return NextResponse.json(redemption, { status: 201 });
  } catch (error) {
    console.error("POST Redemption Error:", error);
    return NextResponse.json({ error: "Failed to request reward" }, { status: 500 });
  }
}