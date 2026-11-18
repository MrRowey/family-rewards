import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimReward } from "@/lib/domain/redemptions";

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

// Canonical reward claim endpoint; both paths share the validated transactional handler.
export { POST } from "../rewards/claim/route";
