import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { approveCompletion, declineCompletion } from "@/lib/domain/completions";
import { approveReward, declineReward } from "@/lib/domain/redemptions";

export async function GET() {
  try {
    const [pendingTasks, pendingRewards] = await Promise.all([
      prisma.completion.findMany({ where: { status: "PENDING" }, include: { child: true, task: true }, orderBy: { completedAt: "asc" } }),
      prisma.rewardRedemption.findMany({ where: { status: "PENDING" }, include: { child: true, reward: true }, orderBy: { requestedAt: "asc" } }),
    ]);
    return NextResponse.json({ pendingTasks, pendingRewards });
  } catch {
    return NextResponse.json({ error: "Failed to load approvals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, type, action } = await request.json();
    if (typeof id !== "string" || !["TASK", "REWARD"].includes(type) || !["APPROVE", "DECLINE"].includes(action)) {
      return NextResponse.json({ error: "Invalid approval request" }, { status: 400 });
    }
    if (type === "TASK") {
      if (action === "APPROVE") await approveCompletion(id);
      else await declineCompletion(id);
    } else {
      if (action === "APPROVE") await approveReward(id);
      else await declineReward(id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    const status = message.startsWith("NOT_FOUND") ? 404 : /^(INVALID_STATE|CONCURRENCY_ERROR|OUT_OF_STOCK)/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
