import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [children, tasks, subSteps, rewards, assignments, completions, redemptions, logs, config, rewardAssignments, shopPlans, groupPledges, badges, childBadges, avatarUnlocks, xpLedger, avatarCurrencyLedger, avatarMilestones] =
      await prisma.$transaction([
        prisma.child.findMany(),
        prisma.task.findMany(),
        prisma.subStep.findMany(),
        prisma.reward.findMany(),
        prisma.taskAssignment.findMany(),
        prisma.completion.findMany(),
        prisma.rewardRedemption.findMany(),
        prisma.auditLog.findMany(),
        prisma.familyConfig.findFirst(),
        prisma.rewardAssignment.findMany(),
        prisma.shopPlan.findMany(),
        prisma.groupRewardPledge.findMany(),
        prisma.badge.findMany(),
        prisma.childBadge.findMany(),
        prisma.avatarUnlock.findMany(),
        prisma.xpLedger.findMany(),
        prisma.avatarCurrencyLedger.findMany(),
        prisma.avatarMilestone.findMany(),
      ], { isolationLevel: "RepeatableRead" });

    const backup = {
      timestamp: new Date().toISOString(),
      version: "3.0",
      data: {
        // Never export the parent authentication credential hash.
        config: config ? { ...config, parentPin: null } : null,
        children,
        tasks,
        subSteps,
        rewards,
        assignments,
        completions,
        redemptions,
        logs,
        rewardAssignments,
        shopPlans,
        groupPledges,
        badges,
        childBadges,
        avatarUnlocks,
        xpLedger,
        avatarCurrencyLedger,
        avatarMilestones,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="family-rewards-backup-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}