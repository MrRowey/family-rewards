import type { Prisma } from "@prisma/client";
import { ACHIEVEMENTS, COINS_PER_ACHIEVEMENT, longestDailyStreak, type AchievementRule } from "@/lib/progression";

type Transaction = Prisma.TransactionClient;

export async function achievementStats(tx: Transaction, childId: string): Promise<Record<AchievementRule, number>> {
  const [completions, redemptions] = await Promise.all([
    tx.completion.findMany({ where: { childId, status: "APPROVED" }, select: { forDate: true, starsAwarded: true } }),
    tx.rewardRedemption.count({ where: { childId, status: "APPROVED" } }),
  ]);
  return {
    TOTAL_TASKS: completions.length,
    STARS_EARNED: completions.reduce((sum, item) => sum + (item.starsAwarded ?? 0), 0),
    REWARDS_REDEEMED: redemptions,
    STREAK_DAYS: longestDailyStreak(completions.map(item => item.forDate)),
  };
}

/** Run within the same transaction as the approved chore or redemption. */
export async function awardAchievements(tx: Transaction, childId: string): Promise<number> {
  const stats = await achievementStats(tx, childId);
  let earned = 0;
  for (const item of ACHIEVEMENTS) {
    if (stats[item.ruleType] < item.threshold) continue;
    let badge = await tx.badge.findFirst({
      where: { title: item.title, ruleType: item.ruleType, threshold: item.threshold },
    });
    if (!badge) badge = await tx.badge.create({
      data: { title: item.title, icon: item.icon, description: item.description, ruleType: item.ruleType, threshold: item.threshold },
    });
    const result = await tx.childBadge.createMany({ data: [{ childId, badgeId: badge.id }], skipDuplicates: true });
    if (result.count) {
      await tx.avatarCurrencyLedger.create({ data: { childId, sourceKey: `achievement:${item.key}:v1`, delta: COINS_PER_ACHIEVEMENT, reason: "ACHIEVEMENT" } });
      earned += COINS_PER_ACHIEVEMENT;
    }
  }
  if (earned) {
    await tx.child.update({ where: { id: childId }, data: { avatarCoins: { increment: earned } } });
  }
  return earned;
}
