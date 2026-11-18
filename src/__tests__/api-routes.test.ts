import { describe, expect, it } from "vitest";

import * as tasks from "@/app/api/tasks/route";
import * as legacyTasks from "@/app/api/parent/tasks/route";
import * as assignments from "@/app/api/assignments/route";
import * as taskAssignments from "@/app/api/task-assignments/route";
import * as completions from "@/app/api/completions/route";
import * as taskCompletions from "@/app/api/task-completions/route";
import * as rewardAssignments from "@/app/api/reward-assignments/route";
import * as legacyRewardAssignments from "@/app/api/rewards/assignment/route";
import * as kiosk from "@/app/api/kiosk/settings/route";
import * as legacyKiosk from "@/app/api/config/kiosk/route";
import * as claims from "@/app/api/rewards/claim/route";
import * as redemptions from "@/app/api/redemptions/route";

describe("canonical API route compatibility", () => {
  it("keeps parent task aliases using the same implementation", () => {
    expect(legacyTasks.GET).toBe(tasks.GET);
    expect(legacyTasks.POST).toBe(tasks.POST);
  });
  it("preserves task assignment and completion methods", () => {
    expect(taskAssignments.GET).toBe(assignments.GET);
    expect(taskAssignments.POST).toBe(assignments.POST);
    expect(taskAssignments.DELETE).toBe(assignments.DELETE);
    expect(taskCompletions.GET).toBe(completions.GET);
    expect(taskCompletions.POST).toBe(completions.POST);
    expect(taskCompletions.PATCH).toBe(completions.PATCH);
  });
  it("preserves reward visibility semantics and kiosk settings", () => {
    expect(rewardAssignments.POST).toBe(legacyRewardAssignments.POST);
    expect(rewardAssignments.DELETE).toBe(legacyRewardAssignments.DELETE);
    expect(kiosk.GET).toBe(legacyKiosk.GET);
    expect(kiosk.PATCH).toBe(legacyKiosk.PATCH);
  });
  it("uses the same transactional reward claim handler", () => {
    expect(redemptions.POST).toBe(claims.POST);
  });
});
