import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { redemptionId, action } = await request.json(); // action: "APPROVE" | "DECLINE"

    if (!redemptionId || !action) {
      return NextResponse.json(
        { error: "Redemption ID and Action are required" },
        { status: 400 }
      );
    }

    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true, child: true },
    });

    if (!redemption) {
      return NextResponse.json(
        { error: "Redemption record not found" },
        { status: 404 }
      );
    }

    if (action === "DECLINE") {
      // Refund stars back to the child, delete redemption, and log audit event
      await prisma.$transaction([
        prisma.child.update({
          where: { id: redemption.childId },
          data: { stars: { increment: redemption.reward.starCost } },
        }),
        prisma.rewardRedemption.delete({
          where: { id: redemptionId },
        }),
        prisma.auditLog.create({
          data: {
            actor: "Parent",
            actorType: "PARENT",
            action: "DECLINED_REWARD",
            details: `Declined "${redemption.reward.title}" for ${redemption.child.name}. Refunded ${redemption.reward.starCost} stars.`,
          },
        }),
      ]);

      return NextResponse.json({ message: "Reward request declined and stars refunded" });
    }

    if (action === "APPROVE") {
      // Mark as APPROVED, decrement reward stock, and log audit event
      await prisma.$transaction([
        prisma.rewardRedemption.update({
          where: { id: redemptionId },
          data: { status: "APPROVED" },
        }),
        prisma.reward.update({
          where: { id: redemption.rewardId },
          data: { currentStock: { decrement: 1 } },
        }),
        prisma.auditLog.create({
          data: {
            actor: "Parent",
            actorType: "PARENT",
            action: "APPROVED_REWARD",
            details: `Approved "${redemption.reward.title}" for ${redemption.child.name}.`,
          },
        }),
      ]);

      return NextResponse.json({ message: "Reward request approved" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Redemption Approval Error:", error);
    return NextResponse.json(
      { error: "Failed to process reward approval" },
      { status: 500 }
    );
  }
}