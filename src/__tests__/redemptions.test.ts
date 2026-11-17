import { describe, it, expect, beforeEach, vi } from "vitest";

const prismaMock = {
  child: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  reward: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  rewardAssignment: { findMany: vi.fn() },
  rewardRedemption: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prismaMock)),
  },
}));

import { claimReward, approveReward, declineReward, refundReward } from "@/lib/domain/redemptions";

describe("Redemption Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.rewardAssignment.findMany.mockResolvedValue([]);
  });

  it("should deduct stars when claiming a reward", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10, dob: new Date("2016-01-01") });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2, isVisible: true, isGroup: false, minAge: 0, maxAge: 18, targetMonth: null });
    prismaMock.rewardRedemption.findFirst.mockResolvedValue(null);
    prismaMock.child.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.rewardRedemption.create.mockResolvedValue({ id: "red1", status: "PENDING" });

    const result = await claimReward("c1", "r1");

    expect(prismaMock.child.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", stars: { gte: 5 } },
      data: { stars: { decrement: 5 } },
    });
    expect(result).toEqual({ id: "red1", status: "PENDING" });
  });

  it("should throw INSUFFICIENT_STARS when child balance is too low", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 3, dob: new Date("2016-01-01") });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2, isVisible: true, isGroup: false, minAge: 0, maxAge: 18, targetMonth: null });

    await expect(claimReward("c1", "r1")).rejects.toThrow("INSUFFICIENT_STARS");
  });

  it("rejects hidden rewards", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10, dob: new Date("2016-01-01") });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2, isVisible: false, isGroup: false, minAge: 0, maxAge: 18, targetMonth: null });
    await expect(claimReward("c1", "r1")).rejects.toThrow("NOT_ELIGIBLE");
    expect(prismaMock.child.updateMany).not.toHaveBeenCalled();
  });

  it("rejects rewards assigned to another child", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10, dob: new Date("2016-01-01") });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2, isVisible: true, isGroup: false, minAge: 0, maxAge: 18, targetMonth: null });
    prismaMock.rewardAssignment.findMany.mockResolvedValue([{ childId: "c2" }]);
    await expect(claimReward("c1", "r1")).rejects.toThrow("NOT_ELIGIBLE");
  });

  it("rejects rewards outside the child's age range", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10, dob: new Date("2016-01-01") });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2, isVisible: true, isGroup: false, minAge: 16, maxAge: 18, targetMonth: null });
    await expect(claimReward("c1", "r1")).rejects.toThrow("NOT_ELIGIBLE");
  });

  it("should decrement stock and mark approved", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "red1",
      status: "PENDING",
      rewardId: "r1",
      childId: "c1",
      reward: { title: "Toy", starCost: 5 },
      child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveReward("red1");

    expect(prismaMock.reward.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", currentStock: { gt: 0 } },
      data: { currentStock: { decrement: 1 } },
    });
    expect(result).toEqual({ success: true });
  });

  it("should refund stars on decline", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "red1",
      status: "PENDING",
      childId: "c1",
      rewardId: "r1",
      reward: { title: "Toy", starCost: 5 },
      child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });

    const result = await declineReward("red1");

    expect(prismaMock.child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { stars: { increment: 5 } },
    });
    expect(result).toEqual({ success: true });
  });

  it("should restore stock and refund stars on refund", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "red1",
      status: "APPROVED",
      childId: "c1",
      rewardId: "r1",
      reward: { title: "Toy", starCost: 5 },
      child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });

    const result = await refundReward("red1");

    expect(prismaMock.child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { stars: { increment: 5 } },
    });
    expect(prismaMock.reward.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { currentStock: { increment: 1 } },
    });
    expect(result).toEqual({ success: true });
  });
});