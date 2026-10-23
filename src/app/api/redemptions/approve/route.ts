import { NextResponse } from "next/server";
import { approveReward, declineReward } from "@/lib/domain/redemptions";

export async function POST(request: Request) {
  try {
    const { redemptionId, action } = await request.json();

    if (!redemptionId || !action) {
      return NextResponse.json({ error: "redemptionId and action are required" }, { status: 400 });
    }

    if (action === "APPROVE") {
      const res = await approveReward(redemptionId);
      return NextResponse.json(res);
    }

    if (action === "DECLINE") {
      const res = await declineReward(redemptionId);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process reward approval";
    if (message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.startsWith("INVALID_STATE") || message.startsWith("CONCURRENCY_ERROR")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process reward approval" }, { status: 500 });
  }
}