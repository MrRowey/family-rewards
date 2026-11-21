import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, getProgress, longestDailyStreak } from "@/lib/progression";

describe("avatar progression", () => {
  it("starts at level one with no progress", () => {
    expect(getProgress(0)).toEqual({ level: 1, xp: 0, current: 0, required: 100, percent: 0 });
  });

  it("awards a new level at exactly 100 XP and carries over progress", () => {
    expect(getProgress(99)).toMatchObject({ level: 1, current: 99, percent: 99 });
    expect(getProgress(100)).toMatchObject({ level: 2, current: 0, percent: 0 });
    expect(getProgress(125)).toMatchObject({ level: 2, current: 25, percent: 25 });
    expect(getProgress(300)).toMatchObject({ level: 4, current: 0 });
  });

  it("does not show negative XP", () => {
    expect(getProgress(-20)).toEqual(getProgress(0));
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
