import { NextResponse } from "next/server";
import { refundReward } from "@/lib/domain/redemptions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { redemptionId, decision, returnToStock } = body ?? {};

    if (typeof redemptionId !== "string" || !redemptionId || (decision !== "APPROVE" && decision !== "DECLINE")) {
      return NextResponse.json({ error: "A redemption and an approval or decline decision are required" }, { status: 400 });
    }

    if (returnToStock !== undefined && typeof returnToStock !== "boolean") {
      return NextResponse.json({ error: "Return to stock must be true or false" }, { status: 400 });
    }
    const res = await refundReward(redemptionId, decision, returnToStock);
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