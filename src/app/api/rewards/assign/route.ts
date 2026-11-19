import { NextResponse } from "next/server";
import { toggleRewardAssignment } from "@/features/rewards/assignments";

// Compatibility endpoint: existing clients use POST to toggle assignment.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rewardId, childId } = body ?? {};
    if (typeof rewardId !== "string" || !rewardId || typeof childId !== "string" || !childId) {
      return NextResponse.json({ error: "rewardId and childId are required" }, { status: 400 });
    }
    const result = await toggleRewardAssignment(rewardId, childId);
    return NextResponse.json(result, { status: result.action === "added" ? 201 : 200 });
  } catch {
    return NextResponse.json({ error: "Failed to toggle assignment" }, { status: 500 });
  }
}
