import { describe, it, expect, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";

const transactionMock = vi.fn();
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
    $transaction: transactionMock,
  },
}));

import { claimReward, approveReward, declineReward, refundReward } from "@/lib/domain/redemptions";

describe("Redemption Domain Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation((callback) => callback(prismaMock));
  });

  it("should deduct stars when claiming a reward", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10 });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2 });
    prismaMock.rewardRedemption.findFirst.mockResolvedValue(null);
    prismaMock.child.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.rewardRedemption.create.mockResolvedValue({ id: "red1", status: "PENDING" });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 1 });

    const result = await claimReward("c1", "r1");

    expect(prismaMock.child.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", stars: { gte: 5 } },
      data: { stars: { decrement: 5 } },
    });
    expect(prismaMock.reward.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", currentStock: { gt: 0 } },
      data: { currentStock: { decrement: 1 } },
    });
    expect(prismaMock.rewardRedemption.create).toHaveBeenCalledWith({ data: { childId: "c1", rewardId: "r1", status: "PENDING", stockReserved: true } });
    expect(result).toEqual({ id: "red1", status: "PENDING" });
  });

  it("should throw INSUFFICIENT_STARS when child balance is too low", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 3 });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 2 });

    await expect(claimReward("c1", "r1")).rejects.toThrow("INSUFFICIENT_STARS");
  });

  it("should approve without deducting already-reserved stock", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "red1",
      status: "PENDING",
      stockReserved: true,
      rewardId: "r1",
      childId: "c1",
      reward: { title: "Toy", starCost: 5 },
      child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 1 });

    const result = await approveReward("red1");

    expect(prismaMock.reward.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  it("should refund stars on decline", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "red1",
      status: "PENDING",
      stockReserved: true,
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
    expect(prismaMock.reward.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { currentStock: { increment: 1 } },
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

  it("does not charge or reserve stock again for an existing pending claim", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 0 });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 0 });
    prismaMock.rewardRedemption.findFirst.mockResolvedValue({ id: "existing", status: "PENDING" });
    await expect(claimReward("c1", "r1")).resolves.toEqual({ id: "existing", status: "PENDING" });
    expect(prismaMock.child.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.reward.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a claim if atomic stock reservation fails", async () => {
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10 });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 1 });
    prismaMock.rewardRedemption.findFirst.mockResolvedValue(null);
    prismaMock.child.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 0 });
    await expect(claimReward("c1", "r1")).rejects.toThrow("OUT_OF_STOCK");
    expect(prismaMock.rewardRedemption.create).not.toHaveBeenCalled();
  });

  it("deducts stock when approving a legacy unreserved claim", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "legacy", status: "PENDING", stockReserved: false, rewardId: "r1", childId: "c1",
      reward: { title: "Toy", starCost: 5 }, child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 1 });
    await expect(approveReward("legacy")).resolves.toEqual({ success: true });
    expect(prismaMock.reward.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", currentStock: { gt: 0 } }, data: { currentStock: { decrement: 1 } },
    });
  });

  it("does not restore stock when declining a legacy unreserved claim", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "legacy", status: "PENDING", stockReserved: false, rewardId: "r1", childId: "c1",
      reward: { title: "Toy", starCost: 5 }, child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });
    await expect(declineReward("legacy")).resolves.toEqual({ success: true });
    expect(prismaMock.reward.update).not.toHaveBeenCalled();
    expect(prismaMock.child.update).toHaveBeenCalled();
  });

  it("rolls back approval if legacy stock is exhausted", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "legacy", status: "PENDING", stockReserved: false, rewardId: "r1", childId: "c1",
      reward: { title: "Toy", starCost: 5 }, child: { name: "Alex" },
    });
    prismaMock.rewardRedemption.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 0 });
    await expect(approveReward("legacy")).rejects.toThrow("OUT_OF_STOCK");
  });
  it("retries a serialization conflict and succeeds on the next transaction", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization failure", {
      code: "P2034", clientVersion: "7.10.1",
    });
    transactionMock.mockRejectedValueOnce(conflict);
    prismaMock.child.findUnique.mockResolvedValue({ id: "c1", name: "Alex", stars: 10 });
    prismaMock.reward.findUnique.mockResolvedValue({ id: "r1", title: "Toy", starCost: 5, currentStock: 1 });
    prismaMock.rewardRedemption.findFirst.mockResolvedValue(null);
    prismaMock.child.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.reward.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.rewardRedemption.create.mockResolvedValue({ id: "red1", status: "PENDING" });

    await expect(claimReward("c1", "r1")).resolves.toEqual({ id: "red1", status: "PENDING" });
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(prismaMock.rewardRedemption.create).toHaveBeenCalledTimes(1);
  });

  it("stops after three serialization conflicts", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("serialization failure", {
      code: "P2034", clientVersion: "7.10.1",
    });
    transactionMock.mockRejectedValue(conflict);
    await expect(claimReward("c1", "r1")).rejects.toMatchObject({ code: "P2034" });
    expect(transactionMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry ordinary domain errors", async () => {
    prismaMock.child.findUnique.mockResolvedValue(null);
    prismaMock.reward.findUnique.mockResolvedValue(null);
    await expect(claimReward("missing", "missing")).rejects.toThrow("NOT_FOUND");
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });

  it("does not refund stars twice when a redemption is no longer pending", async () => {
    prismaMock.rewardRedemption.findUnique.mockResolvedValue({
      id: "red1", status: "DECLINED", stockReserved: true,
      rewardId: "r1", childId: "c1", reward: { starCost: 5 }, child: { name: "Alex" },
    });
    await expect(declineReward("red1")).rejects.toThrow("INVALID_STATE");
    expect(prismaMock.child.update).not.toHaveBeenCalled();
    expect(prismaMock.reward.update).not.toHaveBeenCalled();
  });

});