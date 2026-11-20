export const XP_PER_APPROVED_CHORE = 20;
export const COINS_PER_APPROVED_CHORE = 1;
export const COINS_PER_LEVEL = 5;
export const COINS_PER_ACHIEVEMENT = 5;
export const XP_PER_LEVEL = 100;

export function getProgress(xp: number) {
  const safe = Math.max(0, xp);
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const current = safe % XP_PER_LEVEL;
  return { level, xp: safe, current, required: XP_PER_LEVEL, percent: Math.round(current / XP_PER_LEVEL * 100) };
}

export type AchievementRule = "TOTAL_TASKS" | "STARS_EARNED" | "REWARDS_REDEEMED" | "STREAK_DAYS";
export type Achievement = { key: string; title: string; icon: string; description: string; ruleType: AchievementRule; threshold: number };
export const ACHIEVEMENTS: Achievement[] = [
  { key: "FIRST_CHORE", title: "First Steps", icon: "🌟", description: "Complete your first approved chore", ruleType: "TOTAL_TASKS", threshold: 1 },
  { key: "FIVE_CHORES", title: "High Five", icon: "✋", description: "Complete 5 approved chores", ruleType: "TOTAL_TASKS", threshold: 5 },
  { key: "TEN_CHORES", title: "Chore Champion", icon: "🏆", description: "Complete 10 approved chores", ruleType: "TOTAL_TASKS", threshold: 10 },
  { key: "TWENTY_FIVE_CHORES", title: "Super Helper", icon: "🦸", description: "Complete 25 approved chores", ruleType: "TOTAL_TASKS", threshold: 25 },
  { key: "FIFTY_CHORES", title: "Family Hero", icon: "👑", description: "Complete 50 approved chores", ruleType: "TOTAL_TASKS", threshold: 50 },
  ...[10, 50, 100, 250, 500].map((threshold): Achievement => ({ key: `STARS_${threshold}`, title: `${threshold} Star Collector`, icon: "⭐", description: `Earn ${threshold} Stars from approved chores`, ruleType: "STARS_EARNED", threshold })),
  ...[1, 3, 5, 10].map((threshold): Achievement => ({ key: `REWARDS_${threshold}`, title: threshold === 1 ? "First Reward" : `${threshold} Reward Explorer`, icon: "🎁", description: `Redeem ${threshold} approved rewards`, ruleType: "REWARDS_REDEEMED", threshold })),
  ...[3, 7, 14, 30].map((threshold): Achievement => ({ key: `STREAK_${threshold}`, title: `${threshold}-Day Streak`, icon: "🔥", description: `Complete approved chores on ${threshold} consecutive days`, ruleType: "STREAK_DAYS", threshold })),
];

export function longestDailyStreak(dates: Date[]): number {
  const days = [...new Set(dates.map(date => date.toISOString().slice(0, 10)))].sort();
  let best = 0, current = 0, previous: number | null = null;
  for (const day of days) {
    const timestamp = Date.parse(day + "T00:00:00Z");
    current = previous !== null && timestamp - previous === 86400000 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = timestamp;
  }
  return best;
}
