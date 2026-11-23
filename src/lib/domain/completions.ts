import { prisma } from "@/lib/prisma";
import { COINS_PER_LEVEL, getProgress, rollChoreXp } from "@/lib/progression";
import { Prisma } from "@prisma/client";
import { clawBackAvatarCoins, creditAvatarCoins, grantedLevelCoins } from "./avatar-currency";
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

      if (existing.status === "REVERSED") throw new Error("INVALID_STATE: A reversed chore cannot be reapproved.");
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

const MAX_RETRIES = 3;
async function retrySerializable<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await work(); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === MAX_RETRIES) throw error;
    }
  }
}

export async function approveCompletion(completionId: string) {
  return retrySerializable(() => prisma.$transaction(async (tx) => {
    const completion = await tx.completion.findUnique({
      where: { id: completionId }, include: { task: true, child: true },
    });
    if (!completion) throw new Error("NOT_FOUND: Completion record not found");
    if (completion.status !== "PENDING") throw new Error("INVALID_STATE: Only PENDING completions can be approved");

    const config = await tx.familyConfig.findFirst({
      select: { xpMinMultiplier: true, xpMaxMultiplier: true, coinsPerLevel: true },
    });
    const minFactor = config?.xpMinMultiplier ?? 5;
    const maxFactor = config?.xpMaxMultiplier ?? 8;
    const perLevel = config?.coinsPerLevel ?? COINS_PER_LEVEL;
    const starsAwarded = completion.task.starValue;
    const xpAwarded = rollChoreXp(starsAwarded, minFactor, maxFactor);

    const updated = await tx.completion.updateMany({
      where: { id: completionId, status: "PENDING" },
      data: { status: "APPROVED", starsAwarded },
    });
    if (updated.count !== 1) throw new Error("CONCURRENCY_ERROR: Completion status already updated");
    await tx.xpLedger.create({
      data: { childId: completion.childId, sourceKey: `completion:${completionId}:approved`,
        delta: xpAwarded, stars: starsAwarded, minFactor, maxFactor },
    });
    const oldLevel = getProgress(completion.child.xp ?? 0).level;
    const starDebtPaid = Math.min(completion.child.starDebt ?? 0, starsAwarded);
    const updatedChild = await tx.child.update({
      where: { id: completion.childId },
      data: {
        stars: { increment: starsAwarded - starDebtPaid },
        starDebt: { decrement: starDebtPaid },
        xp: { increment: xpAwarded },
      },
    });
    const progress = getProgress(updatedChild.xp);
    const rewardedLevel = updatedChild.rewardedLevel;
    let credited = 0;

    // Levels earned previously, subsequently reversed and now recovered, are
    // restored using their original grant amount. They are never paid twice.
    for (let level = Math.max(oldLevel + 1, 2); level <= Math.min(progress.level, rewardedLevel); level++) {
      const originalAmount = await grantedLevelCoins(tx, completion.childId, level);
      if (originalAmount > 0) credited += await creditAvatarCoins(tx, completion.childId,
        `restore:${completionId}:level:${level}`, originalAmount, "LEVEL_RESTORED");
    }
    for (let level = Math.max(rewardedLevel + 1, 2); level <= progress.level; level++) {
      credited += await creditAvatarCoins(tx, completion.childId,
        `level:${level}:v1`, perLevel, "LEVEL_UP");
    }
    if (progress.level > rewardedLevel) {
      await tx.child.update({ where: { id: completion.childId }, data: { rewardedLevel: progress.level } });
    }
    credited += await awardAchievements(tx, completion.childId);
    await tx.auditLog.create({
      data: { actor: "Parent", actorType: "PARENT", action: "APPROVED_TASK",
        details: `Approved chore "${completion.task.title}" for ${completion.child.name} (+${starsAwarded} stars, +${xpAwarded} XP, +${credited} spendable Avatar Coins).` },
    });
    return { success: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

/** A compensating event; original grants and purchased cosmetics remain immutable. */
export async function reverseApprovedCompletion(completionId: string) {
  return retrySerializable(() => prisma.$transaction(async (tx) => {
    const completion = await tx.completion.findUnique({
      where: { id: completionId }, include: { task: true, child: true },
    });
    if (!completion) throw new Error("NOT_FOUND: Completion not found");
    if (completion.status === "REVERSED") return { success: true, alreadyReversed: true };
    if (completion.status !== "APPROVED") throw new Error("INVALID_STATE: Only approved chores can be reversed");
    const grant = await tx.xpLedger.findUnique({
      where: { childId_sourceKey: { childId: completion.childId, sourceKey: `completion:${completionId}:approved` } },
    });
    // Older pre-ledger approvals lack an individual XP snapshot. Never guess
    // their XP, because guessing could corrupt an existing child's balance.
    if (!grant) throw new Error("LEGACY_APPROVAL: This historic chore lacks an XP snapshot");
    if (completion.child.xp < grant.delta) throw new Error("INVALID_STATE: XP balance inconsistent");

    const changed = await tx.completion.updateMany({
      where: { id: completionId, status: "APPROVED" }, data: { status: "REVERSED" },
    });
    if (changed.count !== 1) throw new Error("CONCURRENCY_ERROR: Completion already updated");
    await tx.xpLedger.create({
      data: { childId: completion.childId, sourceKey: `completion:${completionId}:reversed`,
        delta: -grant.delta, stars: -(completion.starsAwarded ?? grant.stars),
        minFactor: grant.minFactor, maxFactor: grant.maxFactor },
    });
    const starsReversed = completion.starsAwarded ?? grant.stars;
    const starsTaken = Math.min(completion.child.stars, starsReversed);
    const starsDebtCreated = starsReversed - starsTaken;
    const beforeLevel = getProgress(completion.child.xp).level;
    const afterLevel = getProgress(completion.child.xp - grant.delta).level;
    await tx.child.update({
      where: { id: completion.childId },
      data: { xp: { decrement: grant.delta }, stars: { decrement: starsTaken },
        starDebt: { increment: starsDebtCreated } },
    });
    let clawback = 0;
    for (let level = Math.max(afterLevel + 1, 2); level <= Math.min(beforeLevel, completion.child.rewardedLevel); level++) {
      clawback += await grantedLevelCoins(tx, completion.childId, level);
    }
    let coinDebtCreated = 0;
    if (clawback > 0) {
      const result = await clawBackAvatarCoins(tx, completion.childId,
        `reversal:${completionId}:level-debt`, clawback);
      coinDebtCreated = result.debtCreated;
    }
    await tx.auditLog.create({
      data: { actor: "Parent", actorType: "PARENT", action: "REVERSED_TASK",
        details: `Reversed chore "${completion.task.title}" for ${completion.child.name}: -${grant.delta} XP, -${starsReversed} Stars (new Star debt ${starsDebtCreated}), revoked ${clawback} Avatar Coins (new debt ${coinDebtCreated}). Owned parts retained.` },
    });
    return { success: true, xpReversed: grant.delta, starsReversed, coinDebtCreated, starsDebtCreated };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
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