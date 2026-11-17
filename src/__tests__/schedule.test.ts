import { describe, expect, it } from "vitest";
import { isAssignmentDue } from "@/lib/domain/schedule";
import { getTodayDate } from "@/lib/domain/dates";

describe("weekly scheduling", () => {
  const monday = { dayOfWeek: 1, repeatInterval: 1, startDate: new Date("2026-11-02T00:00:00Z"), endDate: null };
  it("shows tasks on their scheduled weekday only", () => {
    expect(isAssignmentDue(monday, new Date("2026-11-16T00:00:00Z"))).toBe(true);
    expect(isAssignmentDue(monday, new Date("2026-11-17T00:00:00Z"))).toBe(false);
  });
  it("respects fortnightly cadence", () => {
    const fortnight = { ...monday, repeatInterval: 2 };
    expect(isAssignmentDue(fortnight, new Date("2026-11-02T00:00:00Z"))).toBe(true);
    expect(isAssignmentDue(fortnight, new Date("2026-11-09T00:00:00Z"))).toBe(false);
    expect(isAssignmentDue(fortnight, new Date("2026-11-16T00:00:00Z"))).toBe(true);
  });
  it("respects expiry", () => {
    expect(isAssignmentDue({ ...monday, endDate: new Date("2026-11-15T00:00:00Z") }, new Date("2026-11-16T00:00:00Z"))).toBe(false);
  });
  it("returns a UTC-normalised UK calendar date", () => {
    expect(getTodayDate().toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00.000Z$/);
  });
});
