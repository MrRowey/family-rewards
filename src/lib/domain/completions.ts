import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, COINS_PER_APPROVED_CHORE, COINS_PER_ACHIEVEMENT, COINS_PER_LEVEL, getProgress, XP_PER_APPROVED_CHORE } from "@/lib/progression";
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

    const updatedChild = await tx.child.update({
      where: { id: completion.childId },
      data: {
        stars: { increment: completion.task.starValue },
        avatarCoins: { increment: COINS_PER_APPROVED_CHORE },
        xp: { increment: XP_PER_APPROVED_CHORE },
      },
    });

    const progress = getProgress(updatedChild.xp);
    const levelsEarned = Math.max(0, progress.level - updatedChild.rewardedLevel);
    let bonusCoins = levelsEarned * COINS_PER_LEVEL;
    const approvedCount = await tx.completion.count({ where: { childId: completion.childId, status: "APPROVED" } });
    for (const achievement of ACHIEVEMENTS) {
      if (approvedCount < achievement.threshold) continue;
      let badge = await tx.badge.findFirst({ where: { title: achievement.title, ruleType: "TOTAL_TASKS", threshold: achievement.threshold } });
      if (!badge) badge = await tx.badge.create({ data: { title: achievement.title, description: achievement.description, icon: achievement.icon, ruleType: "TOTAL_TASKS", threshold: achievement.threshold } });
      const awarded = await tx.childBadge.createMany({ data: [{ childId: completion.childId, badgeId: badge.id }], skipDuplicates: true });
      if (awarded.count) bonusCoins += COINS_PER_ACHIEVEMENT;
    }
    if (bonusCoins || levelsEarned) {
      await tx.child.update({
        where: { id: completion.childId },
        data: {
          avatarCoins: { increment: bonusCoins },
          ...(levelsEarned ? { rewardedLevel: progress.level } : {}),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "APPROVED_TASK",
        details: `Approved chore "${completion.task.title}" for ${completion.child.name} (+${completion.task.starValue} stars, +${XP_PER_APPROVED_CHORE} XP, +${COINS_PER_APPROVED_CHORE + bonusCoins} Avatar Coins).`,
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