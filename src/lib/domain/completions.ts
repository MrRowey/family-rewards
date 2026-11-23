import { prisma } from "@/lib/prisma";
import { COINS_PER_APPROVED_CHORE, COINS_PER_LEVEL, getProgress, rollChoreXp } from "@/lib/progression";
import { awardAchievements } from "./achievements";
import { getTodayDate } from "./dates";
import { isAssignmentDue } from "./schedule";

export async function submitCompletion(childId: string, taskId: string, forDateInput?: Date) {
  const forDate = forDateInput || getTodayDate();

  return await prisma.$transaction(async (tx) => {
    const child = await tx.child.findUnique({ where: { id: childId } });
    const task = await tx.task.findUnique({ where: { id: taskId } });

    if (!child || !task) {
      throw new Error("NOT_FOUND: Child or Task record not found");
    }

    const assignments = await tx.taskAssignment.findMany({ where: { childId, taskId } });
    if (!assignments.some((assignment) => isAssignmentDue(assignment, forDate))) {
      throw new Error("NOT_ASSIGNED: Task is not scheduled for this child today");
    }

    const existing = await tx.completion.findUnique({
      where: {
        childId_taskId_forDate: {
          childId,
          taskId,
          forDate,
        },
      },
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "APPROVED") {
        return existing;
      }

      // Re-submit declined task for approval
      return await tx.completion.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          completedAt: new Date(),
        },
      });
    }

    const completion = await tx.completion.create({
      data: {
        childId,
        taskId,
        forDate,
        status: "PENDING",
      },
    });

    await tx.auditLog.create({
      data: {
        actor: child.name,
        actorType: "CHILD",
        action: "COMPLETED_TASK",
        details: `Submitted chore "${task.title}" for approval.`,
      },
    });

    return completion;
  });
}

export async function approveCompletion(completionId: string) {
  return await prisma.$transaction(async (tx) => {
    const completion = await tx.completion.findUnique({
      where: { id: completionId },
      include: { task: true, child: true },
    });

    if (!completion) {
      throw new Error("NOT_FOUND: Completion record not found");
    }

    if (completion.status !== "PENDING") {
      throw new Error("INVALID_STATE: Only PENDING completions can be approved");
    }

    const updated = await tx.completion.updateMany({
      where: { id: completionId, status: "PENDING" },
      data: { status: "APPROVED", starsAwarded: completion.task.starValue },
    });

    if (updated.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Completion status already updated");
    }

    const xpAwarded = rollChoreXp(completion.task.starValue);
    const updatedChild = await tx.child.update({
      where: { id: completion.childId },
      data: {
        stars: { increment: completion.task.starValue },
        avatarCoins: { increment: COINS_PER_APPROVED_CHORE },
        xp: { increment: xpAwarded },
      },
    });

    const progress = getProgress(updatedChild.xp);
    const levelsEarned = Math.max(0, progress.level - updatedChild.rewardedLevel);
    let bonusCoins = levelsEarned * COINS_PER_LEVEL;
    bonusCoins += await awardAchievements(tx, completion.childId);
    if (bonusCoins || levelsEarned) {
      await tx.child.update({
        where: { id: completion.childId },
        data: {
          avatarCoins: { increment: levelsEarned * COINS_PER_LEVEL },
          ...(levelsEarned ? { rewardedLevel: progress.level } : {}),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "APPROVED_TASK",
        details: `Approved chore "${completion.task.title}" for ${completion.child.name} (+${completion.task.starValue} stars, +${xpAwarded} XP, +${COINS_PER_APPROVED_CHORE + bonusCoins} Avatar Coins).`,
      },
    });

    return { success: true };
  });
}

export async function declineCompletion(completionId: string) {
  return await prisma.$transaction(async (tx) => {
    const completion = await tx.completion.findUnique({
      where: { id: completionId },
      include: { task: true, child: true },
    });

    if (!completion) {
      throw new Error("NOT_FOUND: Completion record not found");
    }

    if (completion.status !== "PENDING") {
      throw new Error("INVALID_STATE: Only PENDING completions can be declined");
    }

    const updated = await tx.completion.updateMany({
      where: { id: completionId, status: "PENDING" },
      data: { status: "DECLINED" },
    });

    if (updated.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Completion status already updated");
    }

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "DECLINED_TASK",
        details: `Declined chore "${completion.task.title}" for ${completion.child.name}.`,
      },
    });

    return { success: true };
  });
}