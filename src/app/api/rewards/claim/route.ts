import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, rewardId } = body;

    console.log("Claiming reward:", { childId, rewardId });

    if (!childId || !rewardId) {
      return NextResponse.json({ error: "childId and rewardId are required" }, { status: 400 });
    }

    const child = await prisma.child.findUnique({ where: { id: childId } });
    const reward = await prisma.reward.findUnique({ where: { id: rewardId } });

    if (!child || !reward) {
      return NextResponse.json({ error: "Child or Reward record not found" }, { status: 404 });
    }

    if (child.stars < reward.starCost) {
      return NextResponse.json({ error: "Insufficient stars balance" }, { status: 400 });
    }

    // Defensive lookup for existing pending redemption
    const existing = await prisma.rewardRedemption.findFirst({
      where: {
        childId,
        rewardId,
        status: "PENDING",
      },
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    // Create redemption record
    const redemption = await prisma.rewardRedemption.create({
      data: {
        childId,
        rewardId,
        status: "PENDING",
      },
    });

    return NextResponse.json(redemption, { status: 201 });
  } catch (error: any) {
    console.error("CRITICAL: POST Reward Claim Error ->", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit reward claim" },
      { status: 500 }
    );
  }
}