import { prisma } from "@/lib/prisma";

export async function assignReward(rewardId: string, childId: string) {
  return prisma.rewardAssignment.upsert({
    where: { childId_rewardId: { childId, rewardId } },
    update: {},
    create: { rewardId, childId },
  });
}

export async function unassignReward(rewardId: string, childId: string) {
  await prisma.rewardAssignment.deleteMany({ where: { rewardId, childId } });
}

export async function toggleRewardAssignment(rewardId: string, childId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.rewardAssignment.findUnique({
      where: { childId_rewardId: { childId, rewardId } },
    });
    if (existing) {
      await tx.rewardAssignment.delete({ where: { childId_rewardId: { childId, rewardId } } });
      return { action: "removed" as const };
    }
    const assignment = await tx.rewardAssignment.create({ data: { rewardId, childId } });
    return { action: "added" as const, assignment };
  });
}
