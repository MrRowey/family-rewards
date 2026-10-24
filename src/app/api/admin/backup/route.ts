import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [children, tasks, subSteps, rewards, assignments, completions, redemptions, logs, config] =
      await Promise.all([
        prisma.child.findMany(),
        prisma.task.findMany(),
        prisma.subStep.findMany(),
        prisma.reward.findMany(),
        prisma.taskAssignment.findMany(),
        prisma.completion.findMany(),
        prisma.rewardRedemption.findMany(),
        prisma.auditLog.findMany(),
        prisma.familyConfig.findFirst(),
      ]);

    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        config,
        children,
        tasks,
        subSteps,
        rewards,
        assignments,
        completions,
        redemptions,
        logs,
      },
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="family-rewards-backup-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}