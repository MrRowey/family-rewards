import { beforeEach, describe, expect, it, vi } from "vitest";

const { findRewards, findChild, updateChild, createAudit, transaction } = vi.hoisted(() => ({
  findRewards: vi.fn(),
  findChild: vi.fn(),
  updateChild: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reward: { findMany: findRewards },
    $transaction: transaction,
  },
}));

import { GET as getRewards } from "@/app/api/rewards/route";
import { POST as adjustStars } from "@/app/api/children/adjust-stars/route";

beforeEach(() => {
  vi.clearAllMocks();
  findRewards.mockResolvedValue([]);
  transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      child: { findUnique: findChild, update: updateChild },
      auditLog: { create: createAudit },
    }),
  );
});

describe("reward visibility boundaries", () => {
  it("restricts public rewards to visible, in-stock individual rewards in the current month", async () => {
    await getRewards(new Request("http://localhost/api/rewards"));
    const where = findRewards.mock.calls[0][0].where;
    expect(where.isVisible).toBe(true);
    expect(where.isGroup).toBe(false);
    expect(where.currentStock).toEqual({ gt: 0 });
    expect(where.OR).toContainEqual({ targetMonth: null });
  });

  it("does not expose other children's reward assignments", async () => {
    findRewards.mockResolvedValue([
      { id: "a", assignments: [{ childId: "child1" }, { childId: "child2" }] },
      { id: "b", assignments: [] },
      { id: "c", assignments: [{ childId: "child2" }] },
    ]);
    const response = await getRewards(new Request("http://localhost/api/rewards?childId=child1"));
    const body = await response.json();
    expect(body.map((r: { id: string }) => r.id)).toEqual(["a", "b"]);
    expect(body[0].assignments).toEqual([{ childId: "child1" }]);
    expect(body[1].assignments).toEqual([]);
  });

  it("does not expose child-specific rewards without a selected child", async () => {
    findRewards.mockResolvedValue([
      { id: "assigned", assignments: [{ childId: "child1" }] },
      { id: "global", assignments: [] },
    ]);
    const response = await getRewards(new Request("http://localhost/api/rewards"));
    const body = await response.json();
    expect(body.map((r: { id: string }) => r.id)).toEqual(["global"]);
  });

  it("retains full parent access for the dashboard", async () => {
    await getRewards(new Request("http://localhost/api/parent/rewards?month=11"));
    expect(findRewards.mock.calls[0][0].where).toEqual({ targetMonth: 11 });
  });

  it("rejects invalid month values", async () => {
    const response = await getRewards(new Request("http://localhost/api/parent/rewards?month=NaN"));
    expect(response.status).toBe(400);
    expect(findRewards).not.toHaveBeenCalled();
  });
});

describe("star adjustment integrity", () => {
  const request = (body: unknown) => new Request("http://localhost/api/children/adjust-stars", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });

  it("rejects noninteger and nonnumeric amounts", async () => {
    for (const amount of ["10", 1.5, null, 0]) {
      const response = await adjustStars(request({ childId: "child1", amount, reason: "test" }));
      expect(response.status).toBe(400);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("clamps negative adjustments to zero and records the change in the transaction", async () => {
    findChild.mockResolvedValue({ id: "child1", name: "Sam", stars: 3 });
    updateChild.mockResolvedValue({ id: "child1", stars: 0 });
    createAudit.mockResolvedValue({});
    const response = await adjustStars(request({ childId: "child1", amount: -5, reason: "Correction" }));
    expect(response.status).toBe(200);
    expect(updateChild).toHaveBeenCalledWith({ where: { id: "child1" }, data: { stars: 0 } });
    expect(createAudit).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
