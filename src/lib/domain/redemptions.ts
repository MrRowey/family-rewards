import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { calculateAgeProfile } from "@/lib/ageRules";

const MAX_TRANSACTION_ATTEMPTS = 3;

async function withTransactionRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= MAX_TRANSACTION_ATTEMPTS) throw error;
    }
  }
}

export async function claimReward(childId: string, rewardId: string) {
  return await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const child = await tx.child.findUnique({ where: { id: childId } });
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });

    if (!child || !reward) {
      throw new Error("NOT_FOUND: Child or Reward record not found");
    }

    // Eligibility must be validated before returning an existing pending claim.
    if (reward.isGroup || reward.isArchived) {
      throw new Error("NOT_ELIGIBLE: Reward is not available for individual claims");
    }
    const age = calculateAgeProfile(child.dob).ageYears;
    if (age < reward.minAge || age > reward.maxAge) {
      throw new Error("NOT_ELIGIBLE: Reward is outside the child's age range");
    }
    const today = new Date();
    if (reward.targetMonth !== null && reward.targetMonth !== today.getMonth() + 1) {
      throw new Error("NOT_ELIGIBLE: Reward is not available this month");
    }
    const plan = await tx.shopPlan.findUnique({
      where: { childId_year_month: { childId, year: today.getFullYear(), month: today.getMonth() + 1 } },
    });
    const assignments = plan ? [] : await tx.rewardAssignment.findMany({ where: { rewardId } });
    if (plan ? !plan.rewardIds.includes(rewardId) : !reward.isVisible || (assignments.length > 0 && !assignments.some((assignment) => assignment.childId === childId))) {
      throw new Error("NOT_ELIGIBLE: Reward is not assigned to this child");
    }

    // Return the existing claim without charging twice or consuming another stock unit.
    const existingPending = await tx.rewardRedemption.findFirst({
      where: { childId, rewardId, status: "PENDING" },
    });
    if (existingPending) return existingPending;

    if (reward.currentStock <= 0) throw new Error("OUT_OF_STOCK: Reward is out of stock");
    if (child.stars < reward.starCost) throw new Error("INSUFFICIENT_STARS: Child does not have enough stars");

    // Atomically deduct stars from child
    const updatedChild = await tx.child.updateMany({
      where: { id: childId, stars: { gte: reward.starCost } },
      data: { stars: { decrement: reward.starCost } },
    });

    if (updatedChild.count === 0) {
      throw new Error("INSUFFICIENT_STARS: Concurrent star balance update failed");
    }

    // Reserve one unit at claim time, preventing pending claims from overselling.
    const reserved = await tx.reward.updateMany({
      where: { id: rewardId, currentStock: { gt: 0 } },
      data: { currentStock: { decrement: 1 } },
    });
    if (reserved.count !== 1) throw new Error("OUT_OF_STOCK: Reward stock exhausted");

    // Create pending redemption
    const redemption = await tx.rewardRedemption.create({
      data: {
        childId,
        rewardId,
        status: "PENDING",
        stockReserved: true,
        starCostAtClaim: reward.starCost,
      },
    });

    await tx.auditLog.create({
      data: {
        actor: child.name,
        actorType: "CHILD",
        action: "REDEEMED_REWARD",
        details: `Requested reward "${reward.title}" for ${reward.starCost} stars. Stars reserved.`,
      },
    });

    return redemption;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function approveReward(redemptionId: string) {
  return await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const redemption = await tx.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true, child: true },
    });

    if (!redemption) {
      throw new Error("NOT_FOUND: Redemption record not found");
    }

    if (redemption.status !== "PENDING") {
      throw new Error("INVALID_STATE: Only PENDING redemptions can be approved");
    }

    // Atomically transition PENDING -> APPROVED
    const updatedRedemption = await tx.rewardRedemption.updateMany({
      where: { id: redemptionId, status: "PENDING" },
      data: { status: "APPROVED" },
    });

    if (updatedRedemption.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Redemption status already changed");
    }

    // Older pending claims did not reserve stock at claim time.
    if (!redemption.stockReserved) {
      const stockUpdate = await tx.reward.updateMany({
        where: { id: redemption.rewardId, currentStock: { gt: 0 } },
        data: { currentStock: { decrement: 1 } },
      });
      if (stockUpdate.count !== 1) throw new Error("OUT_OF_STOCK: Reward stock exhausted");
    }
    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "APPROVED_REWARD",
        details: `Approved reward "${redemption.reward.title}" for ${redemption.child.name}.`,
      },
    });

    return { success: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function declineReward(redemptionId: string) {
  return await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const redemption = await tx.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true, child: true },
    });

    if (!redemption) {
      throw new Error("NOT_FOUND: Redemption record not found");
    }

    if (redemption.status !== "PENDING") {
      throw new Error("INVALID_STATE: Only PENDING redemptions can be declined");
    }

    // Atomically transition PENDING -> DECLINED
    const updatedRedemption = await tx.rewardRedemption.updateMany({
      where: { id: redemptionId, status: "PENDING" },
      data: { status: "DECLINED" },
    });

    if (updatedRedemption.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Redemption status already changed");
    }

    // Release the reserved stock on decline.
    if (redemption.stockReserved) {
      await tx.reward.update({
        where: { id: redemption.rewardId },
        data: { currentStock: { increment: 1 } },
      });
    }

    // Refund reserved stars back to child
    await tx.child.update({
      where: { id: redemption.childId },
      data: { stars: { increment: (redemption.starCostAtClaim ?? redemption.reward.starCost) } },
    });

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "DECLINED_REWARD",
        details: `Declined reward "${redemption.reward.title}" for ${redemption.child.name}. Refunded ${redemption.starCostAtClaim ?? redemption.reward.starCost} stars.`,
      },
    });

    return { success: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export async function refundReward(redemptionId: string, decision?: "APPROVE" | "DECLINE", returnToStock = true) {
  return await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const redemption = await tx.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: true, child: true },
    });

    if (!redemption) {
      throw new Error("NOT_FOUND: Redemption record not found");
    }

    if (redemption.status !== "APPROVED") {
      throw new Error("INVALID_STATE: Only APPROVED redemptions can be refunded");
    }

    if (decision && redemption.refundState !== "PENDING") {
      throw new Error("INVALID_STATE: No pending refund request");
    }

    // Update the request and redemption together before touching balances.
    const updatedRedemption = await tx.rewardRedemption.updateMany({
      where: { id: redemptionId, status: "APPROVED", ...(decision && { refundState: "PENDING" }) },
      data: decision === "DECLINE"
        ? { refundState: "DECLINED" }
        : { status: "REFUNDED", ...(decision && { refundState: "APPROVED" }) },
    });

    if (updatedRedemption.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Redemption status already changed");
    }

    if (decision === "DECLINE") {
      await tx.auditLog.create({
        data: {
          actor: "Parent", actorType: "PARENT", action: "DECLINED_REFUND",
          details: `Declined the refund for "${redemption.reward.title}" for ${redemption.child.name}.`,
        },
      });
      return { success: true };
    }

    // Refund stars & increment stock
    await tx.child.update({
      where: { id: redemption.childId },
      data: { stars: { increment: (redemption.starCostAtClaim ?? redemption.reward.starCost) } },
    });

    if (returnToStock) {
      await tx.reward.update({
        where: { id: redemption.rewardId }, data: { currentStock: { increment: 1 } },
      });
    }

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "REFUNDED_REWARD",
        details: `Refunded ${redemption.starCostAtClaim ?? redemption.reward.starCost} stars to ${redemption.child.name} for "${redemption.reward.title}". ${returnToStock ? "Stock restored." : "Stock unchanged."}`,
      },
    });

    return { success: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}