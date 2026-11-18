import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, parseJson } from "@/lib/api";
import { claimReward } from "@/lib/domain/redemptions";

const ClaimSchema = z.object({
  childId: z.string().min(1),
  rewardId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { childId, rewardId } = await parseJson(request, ClaimSchema);
    return NextResponse.json(await claimReward(childId, rewardId), { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to submit reward claim");
  }
}
