import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rewards/claim -> Submit a reward claim request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, rewardId } = body;

    if (!childId || !rewardId) {
      return NextResponse.json({ error: "childId and rewardId are required" }, { status: 400 });
    }

    const child = await prisma.child.findUnique({ where: { id: childId } });
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });

    if (!child || !reward) {
      return NextResponse.json({ error: "Child or Reward not found" }, { status: 404 });
    }

    if (child.stars < reward.starCost) {
      return NextResponse.json({ error: "Insufficient stars" }, { status: 400 });
    }

    if (reward.currentStock <= 0) {
      return NextResponse.json({ error: "Reward is out of stock for this month" }, { status: 400 });
    }

    // Check if there is already a pending redemption for this child and reward
    const existing = await prisma.rewardRedemption.findFirst({
      where: { childId, rewardId, status: "PENDING" },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const redemption = await prisma.rewardRedemption.create({
      data: {
        childId,
        rewardId,
        status: "PENDING",
      },
      include: { reward: true },
    });

    return NextResponse.json(redemption, { status: 201 });
  } catch (error: any) {
    console.error("Reward Claim Error:", error);
    return NextResponse.json({ error: error.message || "Failed to claim reward" }, { status: 500 });
  }
}