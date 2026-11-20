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

export const ACHIEVEMENTS = [
  { key: "FIRST_CHORE", title: "First Steps", icon: "🌟", description: "Complete your first approved chore", threshold: 1 },
  { key: "FIVE_CHORES", title: "High Five", icon: "✋", description: "Complete 5 approved chores", threshold: 5 },
  { key: "TEN_CHORES", title: "Chore Champion", icon: "🏆", description: "Complete 10 approved chores", threshold: 10 },
  { key: "TWENTY_FIVE_CHORES", title: "Super Helper", icon: "🦸", description: "Complete 25 approved chores", threshold: 25 },
  { key: "FIFTY_CHORES", title: "Family Hero", icon: "👑", description: "Complete 50 approved chores", threshold: 50 },
] as const;
