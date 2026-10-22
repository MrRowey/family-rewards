import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { redemptionId } = await req.json();

    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true, child: true },
    });

    if (!redemption) {
      return NextResponse.json({ error: "Redemption record not found" }, { status: 404 });
    }

    // Refund stars to child, adjust reward stock, and log transaction
    await prisma.$transaction([
      prisma.child.update({
        where: { id: redemption.childId },
        data: { stars: { increment: redemption.reward.starCost } },
      }),
      prisma.reward.update({
        where: { id: redemption.rewardId },
        data: { currentStock: { increment: 1 } },
      }),
      prisma.rewardRedemption.delete({
        where: { id: redemptionId },
      }),
      prisma.auditLog.create({
        data: {
          actor: "Parent",
          actorType: "PARENT",
          action: "REFUNDED_REWARD",
          details: `Refunded ${redemption.reward.starCost} stars to ${redemption.child.name} for "${redemption.reward.title}"`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Stars refunded successfully" });
  } catch (err) {
    console.error("Refund error:", err);
    return NextResponse.json({ error: "Failed to refund reward" }, { status: 500 });
  }
}