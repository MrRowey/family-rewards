import { NextResponse } from "next/server";
import { refundReward } from "@/lib/domain/redemptions";

export async function POST(req: Request) {
  try {
    const { redemptionId } = await req.json();

    if (!redemptionId) {
      return NextResponse.json({ error: "redemptionId is required" }, { status: 400 });
    }

    const res = await refundReward(redemptionId);
    return NextResponse.json(res);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to refund reward";
    if (message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.startsWith("INVALID_STATE") || message.startsWith("CONCURRENCY_ERROR")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to refund reward" }, { status: 500 });
  }
}