export const COINS_PER_APPROVED_CHORE = 0;
export const COINS_PER_LEVEL = 25;
export const COINS_PER_ACHIEVEMENT = 5;
import { randomInt } from "node:crypto";

// Version 1 of the approved level curve. Existing earned level entitlements
// remain tracked by Child.rewardedLevel, never by recalculating a coin balance.
export const LEVEL_CURVE_VERSION = 1;
const ANCHORS: [number, number][] = [[10, 200], [15, 350], [20, 550], [25, 800], [30, 1100], [40, 1850], [50, 2800]];

export function xpRequiredForLevel(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("Invalid level");
  if (level < 10) return 50 + 15 * (level - 1);
  for (let i = 1; i < ANCHORS.length; i++) {
    const [upperLevel, upperXp] = ANCHORS[i];
    const [lowerLevel, lowerXp] = ANCHORS[i - 1];
    if (level <= upperLevel) return Math.round(lowerXp + (upperXp - lowerXp) * (level - lowerLevel) / (upperLevel - lowerLevel));
  }
  return 2800 + 95 * (level - 50);
}

export function rollChoreXp(starsAwarded: number, minMultiplier = 5, maxMultiplier = 8): number {
  if (!Number.isSafeInteger(starsAwarded) || starsAwarded < 0 || starsAwarded > 100000 ||
      !Number.isSafeInteger(minMultiplier) || !Number.isSafeInteger(maxMultiplier) ||
      minMultiplier < 1 || maxMultiplier > 100 || minMultiplier > maxMultiplier) {
    throw new RangeError("Invalid XP settings or Star award");
  }
  if (starsAwarded === 0) return 0;
  return randomInt(starsAwarded * minMultiplier, starsAwarded * maxMultiplier + 1);
}

export function getProgress(xp: number) {
  const safe = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  let level = 1, spent = 0;
  // The increasing curve makes this bounded for normal family XP balances.
  while (level < 100000) {
    const needed = xpRequiredForLevel(level);
    if (safe - spent < needed) break;
    spent += needed;
    level++;
  }
  const current = safe - spent, required = xpRequiredForLevel(level);
  return { level, xp: safe, current, required, percent: Math.round(current / required * 100) };
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
  const days = [...new Set(dates.map(date => date.toISOString().slice(0, 10)))].toSorted();
  let best = 0, current = 0, previous: number | null = null;
  for (const day of days) {
    const timestamp = Date.parse(day + "T00:00:00Z");
    current = previous !== null && timestamp - previous === 86400000 ? current + 1 : 1;
    best = Math.max(best, current);
    previous = timestamp;
  }
  return best;
}
