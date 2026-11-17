import { NextResponse } from "next/server";
import { assignReward, unassignReward } from "@/features/rewards/assignments";

function parseIds(body: unknown): { rewardId: string; childId: string } | null {
  if (!body || typeof body !== "object") return null;
  const { rewardId, childId } = body as Record<string, unknown>;
  return typeof rewardId === "string" && rewardId.length > 0 && typeof childId === "string" && childId.length > 0 ? { rewardId, childId } : null;
}

export async function POST(request: Request) {
  try {
    const ids = parseIds(await request.json());
    if (!ids) return NextResponse.json({ error: "Reward ID and Child ID are required" }, { status: 400 });
    return NextResponse.json(await assignReward(ids.rewardId, ids.childId), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to assign reward visibility" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ids = parseIds(await request.json());
    if (!ids) return NextResponse.json({ error: "Reward ID and Child ID are required" }, { status: 400 });
    await unassignReward(ids.rewardId, ids.childId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to remove reward visibility" }, { status: 500 });
  }
}
