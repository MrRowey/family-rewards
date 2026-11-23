import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTodayDate } from "@/lib/domain/dates";

const prismaMock = {
  child: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
  familyConfig: { findFirst: vi.fn() },
  task: {
    findUnique: vi.fn(),
  },
  taskAssignment: { findMany: vi.fn() },
  completion: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  rewardRedemption: { count: vi.fn() },
  xpLedger: { create: vi.fn() },
  avatarCurrencyLedger: { create: vi.fn(), findUnique: vi.fn() },
  badge: { findFirst: vi.fn(), create: vi.fn() },
  childBadge: { createMany: vi.fn() },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prismaMock)),
  },
}));

import { submitCompletion, approveCompletion, declineCompletion } from "@/lib/domain/completions";

describe("Completion Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.child.update.mockResolvedValue({ xp: 20, rewardedLevel: 1 });
    prismaMock.familyConfig.findFirst.mockResolvedValue(null);
    prismaMock.child.findUniqueOrThrow.mockResolvedValue({ avatarCoinDebt: 0, avatarCoins: 0 });
    prismaMock.avatarCurrencyLedger.findUnique.mockResolvedValue(null);
    prismaMock.completion.findMany.mockResolvedValue([]);
    prismaMock.rewardRedemption.count.mockResolvedValue(0);
    prismaMock.childBadge.createMany.mockResolvedValue({ count: 0 });
  });

  it("should create a new completion for today", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex" });
    prismaMock.task.findUnique.mockResolvedValue({ id: "t1", title: "Clean Room" });
    prismaMock.taskAssignment.findMany.mockResolvedValue([{ dayOfWeek: getTodayDate().getUTCDay(), repeatInterval: 1, startDate: new Date("2020-01-01"), endDate: null }]);
    prismaMock.completion.findUnique.mockResolvedValue(null);
    prismaMock.completion.create.mockResolvedValue({ id: "comp1", status: "PENDING" });

    const result = await submitCompletion("c1", "t1");

    expect(prismaMock.completion.create).toHaveBeenCalled();
    expect(result).toEqual({ id: "comp1", status: "PENDING" });
  });

  it("should award stars when parent approves completion", async () => {
    prismaMock.completion.findUnique.mockResolvedValue({
      id: "comp1",
      status: "PENDING",
      childId: "c1",
      taskId: "t1",
      task: { title: "Clean Room", starValue: 3 },
      child: { name: "Alex" },
    });
    prismaMock.completion.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveCompletion("comp1");

    expect(prismaMock.child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: {
        stars: { increment: 3 },
        starDebt: { decrement: 0 },
        xp: { increment: expect.any(Number) },
      },
    });
    const xp = prismaMock.child.update.mock.calls[0][0].data.xp.increment;
    expect(xp).toBeGreaterThanOrEqual(15);
    expect(xp).toBeLessThanOrEqual(24);
    expect(result).toEqual({ success: true });
  });

  it("should transition status to DECLINED when parent declines", async () => {
    prismaMock.completion.findUnique.mockResolvedValue({
      id: "comp1",
      status: "PENDING",
      childId: "c1",
      taskId: "t1",
      task: { title: "Clean Room", starValue: 3 },
      child: { name: "Alex" },
    });
    prismaMock.completion.updateMany.mockResolvedValue({ count: 1 });

    const result = await declineCompletion("comp1");

    expect(prismaMock.completion.updateMany).toHaveBeenCalledWith({
      where: { id: "comp1", status: "PENDING" },
      data: { status: "DECLINED" },
    });
    expect(result).toEqual({ success: true });
  });
});