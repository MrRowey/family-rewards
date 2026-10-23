import { NextResponse } from "next/server";
import { claimReward } from "@/lib/domain/redemptions";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, rewardId } = body;

    if (!childId || !rewardId) {
      return NextResponse.json({ error: "childId and rewardId are required" }, { status: 400 });
    }

    const redemption = await claimReward(childId, rewardId);
    return NextResponse.json(redemption, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit reward claim";
    if (message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.startsWith("INSUFFICIENT_STARS") || message.startsWith("OUT_OF_STOCK")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit reward claim" }, { status: 500 });
  }
}