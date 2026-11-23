import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { approveCompletion, reverseApprovedCompletion } from "@/lib/domain/completions";
import { xpRequiredForLevel } from "@/lib/progression";
import { validateAvatarOwnership } from "@/lib/domain/avatar-appearance";

const children: string[] = [];
const tasks: string[] = [];

async function createChild() {
  const child = await prisma.child.create({ data: { name: `Avatar-${randomUUID()}`, dob: new Date("2016-01-01") } });
  children.push(child.id);
  return child;
}
async function createTask(starValue = 10) {
  const task = await prisma.task.create({ data: { title: `Avatar-${randomUUID()}`, starValue } });
  tasks.push(task.id);
  return task;
}
async function pending(childId: string, taskId: string, day: string) {
  return prisma.completion.create({ data: {
    childId, taskId, status: "PENDING", forDate: new Date(`${day}T00:00:00Z`),
  } });
}
afterAll(async () => {
  if (children.length) await prisma.child.deleteMany({ where: { id: { in: children } } });
  if (tasks.length) await prisma.task.deleteMany({ where: { id: { in: tasks } } });
  await prisma.$disconnect();
});

describe("PostgreSQL avatar progression and reversal integrity", () => {
  it("handles simultaneous approvals exactly once and balances the ledgers", async () => {
    const [child, task] = await Promise.all([createChild(), createTask(3)]);
    const event = await pending(child.id, task.id, "2026-11-20");
    const requests = await Promise.allSettled([approveCompletion(event.id), approveCompletion(event.id)]);
    expect(requests.filter(x => x.status === "fulfilled")).toHaveLength(1);
    const saved = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(saved.stars).toBe(3);
    expect(saved.xp).toBeGreaterThanOrEqual(15);
    expect(saved.xp).toBeLessThanOrEqual(24);
    const xp = await prisma.xpLedger.findMany({ where: { childId: child.id } });
    expect(xp).toHaveLength(1);
    expect(xp.reduce((sum, row) => sum + row.delta, 0)).toBe(saved.xp);
    const coins = await prisma.avatarCurrencyLedger.findMany({ where: { childId: child.id } });
    expect(coins.reduce((sum, row) => sum + row.delta, 0)).toBe(saved.avatarCoins);
    expect(coins.reduce((sum, row) => sum + row.debtDelta, 0)).toBe(saved.avatarCoinDebt);
  });

  it("isolates identical achievement keys for different children", async () => {
    const [a, b, task] = await Promise.all([createChild(), createChild(), createTask(1)]);
    const [first, second] = await Promise.all([
      pending(a.id, task.id, "2026-11-20"), pending(b.id, task.id, "2026-11-20"),
    ]);
    await approveCompletion(first.id);
    await approveCompletion(second.id);
    for (const id of [a.id, b.id]) {
      expect(await prisma.avatarCurrencyLedger.count({
        where: { childId: id, sourceKey: "achievement:FIRST_CHORE:v1" },
      })).toBe(1);
    }
  });

  it("awards each tenth-level milestone once and keeps its exclusive halo after an XP reversal", async () => {
    const [child, task] = await Promise.all([createChild(), createTask(10)]);
    const threshold = Array.from({ length: 9 }, (_, i) => xpRequiredForLevel(i + 1)).reduce((a, b) => a + b, 0);
    await prisma.child.update({ where: { id: child.id }, data: { xp: threshold - 25, rewardedLevel: 9 } });
    await prisma.xpLedger.create({ data: {
      childId: child.id, sourceKey: "test:preexisting-xp", delta: threshold - 25, stars: 0, minFactor: 0, maxFactor: 0,
    } });
    const first = await pending(child.id, task.id, "2026-11-20");
    await approveCompletion(first.id);
    const earned = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(earned.rewardedLevel).toBe(10);
    expect(await prisma.avatarMilestone.count({ where: { childId: child.id, level: 10, policyVersion: 1 } })).toBe(1);
    expect(await prisma.avatarCurrencyLedger.count({ where: { childId: child.id, sourceKey: "milestone:10:v1" } })).toBe(1);
    expect(await validateAvatarOwnership(child.id, "bottts", { frame: "level-10-halo" })).toBe(true);
    await reverseApprovedCompletion(first.id);
    expect(await prisma.avatarMilestone.count({ where: { childId: child.id, level: 10 } })).toBe(1);
    expect(await validateAvatarOwnership(child.id, "bottts", { frame: "level-10-halo" })).toBe(true);
    const second = await pending(child.id, task.id, "2026-11-21");
    await approveCompletion(second.id);
    expect(await prisma.avatarMilestone.count({ where: { childId: child.id, level: 10 } })).toBe(1);
    expect(await prisma.avatarCurrencyLedger.count({ where: { childId: child.id, sourceKey: "milestone:10:v1" } })).toBe(1);
  });

  it("reverses XP and level coins, records debt and restores old levels without double payout", async () => {
    const [child, task] = await Promise.all([createChild(), createTask(10)]);
    const first = await pending(child.id, task.id, "2026-11-20");
    await approveCompletion(first.id);
    const earned = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(earned.rewardedLevel).toBe(2);
    expect(earned.avatarCoins).toBeGreaterThanOrEqual(25);
    // Simulate spending all available coins on an owned cosmetic. The ledger and
    // balance change together: a reversal must not remove this purchase.
    await prisma.$transaction(async tx => {
      await tx.avatarUnlock.create({ data: {
        childId: child.id, theme: "bottts", component: "eyesVariant", variant: "owned-test",
        cost: earned.avatarCoins,
      } });
      await tx.avatarCurrencyLedger.create({ data: {
        childId: child.id, sourceKey: "purchase:test-cosmetic", delta: -earned.avatarCoins, reason: "PURCHASE",
      } });
      await tx.child.update({ where: { id: child.id }, data: { avatarCoins: 0 } });
    });
    const reversal = await reverseApprovedCompletion(first.id);
    expect(reversal).toMatchObject({ success: true, coinDebtCreated: 25 });
    const reverted = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(reverted.xp).toBe(0);
    expect(reverted.stars).toBe(0);
    expect(reverted.avatarCoins).toBe(0);
    expect(reverted.avatarCoinDebt).toBe(25);
    expect(reverted.rewardedLevel).toBe(2);
    expect(await prisma.avatarUnlock.count({ where: { childId: child.id } })).toBe(1);
    expect(await reverseApprovedCompletion(first.id)).toEqual({ success: true, alreadyReversed: true });

    const second = await pending(child.id, task.id, "2026-11-21");
    await approveCompletion(second.id);
    const restored = await prisma.child.findUniqueOrThrow({ where: { id: child.id } });
    expect(restored.rewardedLevel).toBe(2);
    expect(restored.avatarCoinDebt).toBe(0);
    expect(await prisma.avatarCurrencyLedger.count({
      where: { childId: child.id, sourceKey: "level:2:v1" },
    })).toBe(1);
    const currency = await prisma.avatarCurrencyLedger.findMany({ where: { childId: child.id } });
    const xp = await prisma.xpLedger.findMany({ where: { childId: child.id } });
    expect(currency.reduce((sum, row) => sum + row.delta, 0)).toBe(restored.avatarCoins);
    expect(currency.reduce((sum, row) => sum + row.debtDelta, 0)).toBe(restored.avatarCoinDebt);
    expect(xp.reduce((sum, row) => sum + row.delta, 0)).toBe(restored.xp);
  });
});
