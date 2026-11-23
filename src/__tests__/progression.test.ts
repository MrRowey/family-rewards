import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, getProgress, longestDailyStreak, xpRequiredForLevel, rollChoreXp } from "@/lib/progression";

describe("avatar progression", () => {
  it("starts at level one and follows the approved curve", () => {
    expect(getProgress(0)).toEqual({ level: 1, xp: 0, current: 0, required: 50, percent: 0 });
    expect(getProgress(49)).toMatchObject({ level: 1, current: 49 });
    expect(getProgress(50)).toMatchObject({ level: 2, current: 0, required: 65 });
    expect(getProgress(115)).toMatchObject({ level: 3, current: 0, required: 80 });
    expect(getProgress(-20)).toEqual(getProgress(0));
  });

  it("uses the approved level curve anchors and secure random Star-based XP bounds", () => {
    expect(xpRequiredForLevel(10)).toBe(200);
    expect(xpRequiredForLevel(15)).toBe(350);
    expect(xpRequiredForLevel(50)).toBe(2800);
    expect(xpRequiredForLevel(51)).toBe(2895);
    for (let i = 0; i < 50; i++) {
      const result = rollChoreXp(3);
      expect(result).toBeGreaterThanOrEqual(15);
      expect(result).toBeLessThanOrEqual(24);
    }
    expect(rollChoreXp(0)).toBe(0);
    expect(() => rollChoreXp(-1)).toThrow();
  });

  it("has 18 distinct achievements across the four progression categories", () => {
    expect(ACHIEVEMENTS).toHaveLength(18);
    expect(new Set(ACHIEVEMENTS.map(item => item.key)).size).toBe(18);
    expect(new Set(ACHIEVEMENTS.map(item => item.title)).size).toBe(18);
    expect(new Set(ACHIEVEMENTS.map(item => item.ruleType))).toEqual(
      new Set(["TOTAL_TASKS", "STARS_EARNED", "REWARDS_REDEEMED", "STREAK_DAYS"]),
    );
  });

  it("counts consecutive days rather than multiple chores on one day", () => {
    expect(longestDailyStreak([
      new Date("2026-11-19T08:00:00Z"),
      new Date("2026-11-19T18:00:00Z"),
      new Date("2026-11-20T10:00:00Z"),
      new Date("2026-11-21T12:00:00Z"),
    ])).toBe(3);
  });

  it("reports the longest historical streak, even with gaps and unordered input", () => {
    expect(longestDailyStreak([
      new Date("2026-11-21T12:00:00Z"),
      new Date("2026-11-18T12:00:00Z"),
      new Date("2026-11-17T12:00:00Z"),
      new Date("2026-11-19T12:00:00Z"),
      new Date("2026-11-15T12:00:00Z"),
    ])).toBe(3);
    expect(longestDailyStreak([])).toBe(0);
  });
});
