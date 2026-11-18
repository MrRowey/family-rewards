import { beforeEach, describe, expect, it, vi } from "vitest";

const { findRewards, findShopPlan, setRewardVisibility, createReward, findChild, updateChild, createAudit, transaction } = vi.hoisted(() => ({
  findRewards: vi.fn(),
  findShopPlan: vi.fn(),
  createReward: vi.fn(),
  setRewardVisibility: vi.fn(),
  findChild: vi.fn(),
  updateChild: vi.fn(),
  createAudit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopPlan: { findUnique: findShopPlan },
    reward: { findMany: findRewards, create: createReward, updateMany: setRewardVisibility },
    $transaction: transaction,
  },
}));

import { POST as createParentReward, PATCH as patchParentReward } from "@/app/api/parent/rewards/route";
import { GET as getRewards } from "@/app/api/rewards/route";
import { POST as adjustStars } from "@/app/api/children/adjust-stars/route";

beforeEach(() => {
  vi.clearAllMocks();
  findRewards.mockResolvedValue([]);
  findShopPlan.mockResolvedValue(null);
  transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({
      child: { findUnique: findChild, update: updateChild },
      auditLog: { create: createAudit },
    }),
  );
});

function jsonPost(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
    expect(findRewards.mock.calls[0][0].where).toEqual({ OR: [{ targetMonth: null }, { targetMonth: 11 }] });
  });

  it("rejects invalid month values", async () => {
    const response = await getRewards(new Request("http://localhost/api/parent/rewards?month=NaN"));
    expect(response.status).toBe(400);
    expect(findRewards).not.toHaveBeenCalled();
  });
});

describe("star adjustment integrity", () => {

  it("rejects noninteger and nonnumeric amounts", async () => {
    for (const amount of ["10", 1.5, null, 0]) {
      const response = await adjustStars(jsonPost("/api/children/adjust-stars", { childId: "child1", amount, reason: "test" }));
      expect(response.status).toBe(400);
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it("clamps negative adjustments to zero and records the change in the transaction", async () => {
    findChild.mockResolvedValue({ id: "child1", name: "Sam", stars: 3 });
    updateChild.mockResolvedValue({ id: "child1", stars: 0 });
    createAudit.mockResolvedValue({});
    const response = await adjustStars(jsonPost("/api/children/adjust-stars", { childId: "child1", amount: -5, reason: "Correction" }));
    expect(response.status).toBe(200);
    expect(updateChild).toHaveBeenCalledWith({ where: { id: "child1" }, data: { stars: 0 } });
    expect(createAudit).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe("parent reward creation", () => {
  const valid = { title: "Movie night", description: "Friday", icon: "🎬", starCost: 10, monthlyStock: 2, isGroup: false };
  it("creates a visible, stocked reward", async () => {
    createReward.mockResolvedValue({ id: "reward1", ...valid, currentStock: 2 });
    const response = await createParentReward(jsonPost("/api/parent/rewards", valid));
    expect(response.status).toBe(201);
    expect(createReward).toHaveBeenCalledWith({ data: expect.objectContaining({ title: "Movie night", starCost: 10, monthlyStock: 2, currentStock: 2, isGroup: false }) });
  });
  it("preserves the group goal flag", async () => {
    createReward.mockResolvedValue({ id: "group1", ...valid, isGroup: true });
    const response = await createParentReward(jsonPost("/api/parent/rewards", { ...valid, isGroup: true }));
    expect(response.status).toBe(201);
    expect(createReward).toHaveBeenCalledWith({ data: expect.objectContaining({ isGroup: true }) });
  });

  it("rejects invalid costs and stock without writing", async () => {
    for (const data of [{ ...valid, starCost: -1 }, { ...valid, starCost: "10" }, { ...valid, monthlyStock: 0 }, { ...valid, title: "" }]) {
      expect((await createParentReward(jsonPost("/api/parent/rewards", data))).status).toBe(400);
    }
    expect(createReward).not.toHaveBeenCalled();
  });
});

it("updates visibility only for an individual prize", async () => {
  setRewardVisibility.mockResolvedValue({ count: 1 });
  const response = await patchParentReward(new Request("http://localhost/api/parent/rewards", {
    method: "PATCH",
    body: JSON.stringify({ id: "prize", isVisible: false }),
  }));
  expect(response.status).toBe(200);
  expect(setRewardVisibility).toHaveBeenCalledWith({
    where: { id: "prize", isGroup: false },
    data: { isVisible: false },
  });
});

it("uses a saved empty month plan instead of global rewards", async () => {
  findRewards.mockResolvedValue([{ id: "global", assignments: [] }]);
  findShopPlan.mockResolvedValue({ rewardIds: [] });
  const response = await getRewards(new Request("http://localhost/api/rewards?childId=child1"));
  expect(await response.json()).toEqual([]);
});

it("uses a month plan as the visibility rule for selected prizes", async () => {
  findRewards.mockResolvedValue([{ id: "planned", assignments: [], isVisible: false }]);
  findShopPlan.mockResolvedValue({ rewardIds: ["planned"] });
  const response = await getRewards(new Request("http://localhost/api/rewards?childId=child1"));
  expect(await response.json()).toMatchObject([{ id: "planned" }]);
  const where = findRewards.mock.calls[0][0].where;
  expect(where).toMatchObject({ id: { in: ["planned"] }, isGroup: false });
  expect(where).not.toHaveProperty("isVisible");
});
