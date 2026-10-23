import { prisma } from "@/lib/prisma";

export async function claimReward(childId: string, rewardId: string) {
  return await prisma.$transaction(async (tx) => {
    const child = await tx.child.findUnique({ where: { id: childId } });
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });

    if (!child || !reward) {
      throw new Error("NOT_FOUND: Child or Reward record not found");
    }

    if (reward.currentStock <= 0) {
      throw new Error("OUT_OF_STOCK: Reward is out of stock");
    }

    if (child.stars < reward.starCost) {
      throw new Error("INSUFFICIENT_STARS: Child does not have enough stars");
    }

    // Check for existing pending redemption
    const existingPending = await tx.rewardRedemption.findFirst({
      where: { childId, rewardId, status: "PENDING" },
    });

    if (existingPending) {
      return existingPending;
    }

    // Atomically deduct stars from child
    const updatedChild = await tx.child.updateMany({
      where: { id: childId, stars: { gte: reward.starCost } },
      data: { stars: { decrement: reward.starCost } },
    });

    if (updatedChild.count === 0) {
      throw new Error("INSUFFICIENT_STARS: Concurrent star balance update failed");
    }

    // Create pending redemption
    const redemption = await tx.rewardRedemption.create({
      data: {
        childId,
        rewardId,
        status: "PENDING",
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
  });
}

export async function approveReward(redemptionId: string) {
  return await prisma.$transaction(async (tx) => {
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

    // Decrement stock
    await tx.reward.update({
      where: { id: redemption.rewardId },
      data: { currentStock: { decrement: 1 } },
    });

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "APPROVED_REWARD",
        details: `Approved reward "${redemption.reward.title}" for ${redemption.child.name}.`,
      },
    });

    return { success: true };
  });
}

export async function declineReward(redemptionId: string) {
  return await prisma.$transaction(async (tx) => {
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

    // Refund reserved stars back to child
    await tx.child.update({
      where: { id: redemption.childId },
      data: { stars: { increment: redemption.reward.starCost } },
    });

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "DECLINED_REWARD",
        details: `Declined reward "${redemption.reward.title}" for ${redemption.child.name}. Refunded ${redemption.reward.starCost} stars.`,
      },
    });

    return { success: true };
  });
}

export async function refundReward(redemptionId: string) {
  return await prisma.$transaction(async (tx) => {
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

    // Atomically transition APPROVED -> REFUNDED
    const updatedRedemption = await tx.rewardRedemption.updateMany({
      where: { id: redemptionId, status: "APPROVED" },
      data: { status: "REFUNDED" },
    });

    if (updatedRedemption.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Redemption status already changed");
    }

    // Refund stars & increment stock
    await tx.child.update({
      where: { id: redemption.childId },
      data: { stars: { increment: redemption.reward.starCost } },
    });

    await tx.reward.update({
      where: { id: redemption.rewardId },
      data: { currentStock: { increment: 1 } },
    });

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "REFUNDED_REWARD",
        details: `Refunded ${redemption.reward.starCost} stars to ${redemption.child.name} for "${redemption.reward.title}". Stock restored.`,
      },
    });

    return { success: true };
  });
}