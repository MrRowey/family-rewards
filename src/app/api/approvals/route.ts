import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/approvals -> Fetch pending task completions and reward redemptions
export async function GET() {
  try {
    const pendingTasks = await prisma.completion.findMany({
      where: { status: "PENDING" },
      include: { 
        child: true, 
        task: true 
      },
      orderBy: { completedAt: "asc" },
    });

    let pendingRewards: any[] = [];
    try {
      pendingRewards = await prisma.rewardRedemption.findMany({
        where: { status: "PENDING" },
        include: { child: true, reward: true },
        orderBy: { requestedAt: "asc" },
      });
    } catch {
      pendingRewards = [];
    }

    return NextResponse.json({ pendingTasks, pendingRewards });
  } catch (error) {
    console.error("GET Approvals Error:", error);
    return NextResponse.json({ pendingTasks: [], pendingRewards: [] }, { status: 200 });
  }
}

// POST /api/approvals -> Process APPROVE or DECLINE
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, type, action } = body;

    if (type === "TASK") {
      const completion = await prisma.completion.findUnique({
        where: { id },
        include: { task: true },
      });

      if (!completion) {
        return NextResponse.json({ error: "Completion record not found" }, { status: 404 });
      }

      if (action === "APPROVE") {
        await prisma.$transaction([
          prisma.completion.update({
            where: { id },
            data: { status: "APPROVED" },
          }),
          prisma.child.update({
            where: { id: completion.childId },
            data: { stars: { increment: completion.task.starValue } },
          }),
        ]);
      } else {
        await prisma.completion.update({
          where: { id },
          data: { status: "DECLINED" },
        });
      }
    } else if (type === "REWARD") {
      const redemption = await prisma.rewardRedemption.findUnique({
        where: { id },
        include: { reward: true, child: true },
      });

      if (!redemption) {
        return NextResponse.json({ error: "Redemption record not found" }, { status: 404 });
      }

      if (action === "APPROVE") {
        if (redemption.child.stars < redemption.reward.starCost) {
          return NextResponse.json({ error: "Insufficient stars" }, { status: 400 });
        }

        await prisma.$transaction([
          prisma.rewardRedemption.update({
            where: { id },
            data: { status: "APPROVED" },
          }),
          prisma.child.update({
            where: { id: redemption.childId },
            data: { stars: { decrement: redemption.reward.starCost } },
          }),
          prisma.reward.update({
            where: { id: redemption.rewardId },
            data: { currentStock: { decrement: 1 } },
          }),
        ]);
      } else {
        await prisma.rewardRedemption.update({
          where: { id },
          data: { status: "DECLINED" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Approvals Error:", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}