import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PATCH } from "@/app/api/parent/rewards/route";
import { prisma } from "@/lib/prisma";
import { approveReward, claimReward, declineReward, refundReward } from "@/lib/domain/redemptions";

const createdChildren: string[] = [];
const createdRewards: string[] = [];

async function child(stars = 20) {
  const row = await prisma.child.create({
    data: { name: `Integration-${randomUUID()}`, dob: new Date("2016-01-01"), stars },
  });
  createdChildren.push(row.id);
  return row;
}

async function reward(stock = 1) {
  const row = await prisma.reward.create({
    data: { title: `Integration-${randomUUID()}`, starCost: 5, currentStock: stock, monthlyStock: stock },
  });
  createdRewards.push(row.id);
  return row;
}

afterAll(async () => {
  if (createdChildren.length) await prisma.child.deleteMany({ where: { id: { in: createdChildren } } });
  if (createdRewards.length) await prisma.reward.deleteMany({ where: { id: { in: createdRewards } } });
  await prisma.$disconnect();
});

describe("PostgreSQL reward integrity", () => {
  it("allows only one of two concurrent claims for the final stock unit", async () => {
    const [a, b, item] = await Promise.all([child(), child(), reward()]);
    const results = await Promise.allSettled([
      claimReward(a.id, item.id),
      claimReward(b.id, item.id),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(0);
    const balances = await prisma.child.findMany({ where: { id: { in: [a.id, b.id] } }, select: { stars: true } });
    expect(balances.map((entry) => entry.stars).toSorted((x, y) => x - y)).toEqual([15, 20]);
    expect(await prisma.rewardRedemption.count({ where: { rewardId: item.id, status: "PENDING" } })).toBe(1);
  });

  it("does not charge twice for two simultaneous claims from one child", async () => {
    const [a, item] = await Promise.all([child(), reward(2)]);
    const results = await Promise.allSettled([claimReward(a.id, item.id), claimReward(a.id, item.id)]);
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);
    const claims = results.filter((result) => result.status === "fulfilled").map((result) => result.value.id);
    expect(new Set(claims).size).toBe(1);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: a.id } })).stars).toBe(15);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(1);
  });

  it("releases stock and stars exactly once when a pending claim is declined", async () => {
    const [a, item] = await Promise.all([child(), reward()]);
    const claim = await claimReward(a.id, item.id);
    await declineReward(claim.id);
    await expect(declineReward(claim.id)).rejects.toThrow("INVALID_STATE");
    expect((await prisma.child.findUniqueOrThrow({ where: { id: a.id } })).stars).toBe(20);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(1);
  });

  it("refunds the claim-time cost after the reward price changes", async () => {
    const [a, item] = await Promise.all([child(), reward()]);
    const claim = await claimReward(a.id, item.id);
    expect((await prisma.rewardRedemption.findUniqueOrThrow({ where: { id: claim.id } })).starCostAtClaim).toBe(5);
    await prisma.reward.update({ where: { id: item.id }, data: { starCost: 12 } });
    await declineReward(claim.id);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: a.id } })).stars).toBe(20);
  });

  it("refunds an approved claim at the original price", async () => {
    const [a, item] = await Promise.all([child(), reward()]);
    const claim = await claimReward(a.id, item.id);
    await approveReward(claim.id);
    await prisma.reward.update({ where: { id: item.id }, data: { starCost: 12 } });
    await refundReward(claim.id);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: a.id } })).stars).toBe(20);
  });

  it("approves an old unreserved claim without double-counting stock", async () => {
    const [a, item] = await Promise.all([child(15), reward()]);
    const legacy = await prisma.rewardRedemption.create({
      data: { childId: a.id, rewardId: item.id, status: "PENDING", stockReserved: false },
    });
    await approveReward(legacy.id);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(0);
    await refundReward(legacy.id);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(1);
  });
});

function editReward(id: string, changes: Record<string, unknown>) {
  return PATCH(new Request("http://localhost/api/parent/rewards", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...changes }) }));
}

describe("Reward editing integrity", () => {
  it("rejects stale stock edits after a claim and preserves the reservation", async () => {
    const [a, item] = await Promise.all([child(), reward(2)]);
    const claim = await claimReward(a.id, item.id);
    expect((await editReward(item.id, { currentStock: 3, expectedCurrentStock: 2 })).status).toBe(409);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(1);
    expect((await editReward(item.id, { title: "Edited reward", starCost: 12 })).status).toBe(200);
    expect((await prisma.rewardRedemption.findUniqueOrThrow({ where: { id: claim.id } })).starCostAtClaim).toBe(5);
    await declineReward(claim.id);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: a.id } })).stars).toBe(20);
    expect((await prisma.reward.findUniqueOrThrow({ where: { id: item.id } })).currentStock).toBe(2);
  });
  it("preserves the effective cost of legacy pending claims before a price edit", async () => {
    const [a, item] = await Promise.all([child(15), reward()]);
    const legacy = await prisma.rewardRedemption.create({ data: { childId: a.id, rewardId: item.id, status: "PENDING", stockReserved: false } });
    expect((await editReward(item.id, { starCost: 12 })).status).toBe(200);
    await declineReward(legacy.id);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: a.id } })).stars).toBe(20);
  });
});
