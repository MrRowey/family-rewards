import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/restore/route";

const { transaction } = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));

const backup = {
  version: "1.0",
  data: {
    children: [], tasks: [], subSteps: [], rewards: [], assignments: [],
    completions: [], redemptions: [], logs: [],
  },
};

function request(body: unknown) {
  return new Request("http://localhost/api/admin/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.resetAllMocks());

it("previews a legacy backup without changing the database", async () => {
  const response = await POST(request({ backup }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ version: "1.0", summary: { children: 0, shopPlans: 0 } });
  expect(transaction).not.toHaveBeenCalled();
});

it("rejects malformed records even with replacement confirmation", async () => {
  const invalid = { ...backup, data: { ...backup.data, children: [{ id: "child", stars: -1 }] } };
  const response = await POST(request({ backup: invalid, confirmation: "REPLACE FAMILY DATA" }));
  expect(response.status).toBe(400);
  expect(transaction).not.toHaveBeenCalled();
});

it("reports a failed transaction without claiming restoration succeeded", async () => {
  transaction.mockRejectedValueOnce(new Error("foreign key violation"));
  const response = await POST(request({ backup, confirmation: "REPLACE FAMILY DATA" }));
  expect(response.status).toBe(409);
  expect(transaction).toHaveBeenCalledOnce();
});

it("previews a complete version-three backup without mutating family balances", async () => {
  const snapshot = {
    version: "3.0",
    data: {
      ...backup.data,
      children: [{ id: "c1", name: "Alex", dob: "2018-01-01T00:00:00.000Z", xp: 17,
        avatarCoins: 5, avatarCoinDebt: 0, starDebt: 0, rewardedLevel: 1, stars: 3 }],
      avatarUnlocks: [{ id: "unlock-1", childId: "c1", theme: "bottts",
        component: "eyesVariant", variant: "premium", cost: 10 }],
      xpLedger: [{ id: "xp-1", childId: "c1", sourceKey: "opening", delta: 17,
        stars: 0, minFactor: 0, maxFactor: 0 }],
      avatarCurrencyLedger: [{ id: "coins-1", childId: "c1", sourceKey: "opening",
        delta: 5, debtDelta: 0, reason: "OPENING_BALANCE" }],
      avatarMilestones: [],
    },
  };
  const response = await POST(request({ backup: snapshot }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    version: "3.0",
    summary: { avatarUnlocks: 1, xpLedger: 1, avatarCurrencyLedger: 1, avatarMilestones: 0 },
  });
  expect(transaction).not.toHaveBeenCalled();
});

it("refuses to restore a version-three snapshot with a missing currency ledger", async () => {
  const snapshot = {
    version: "3.0",
    data: { ...backup.data,
      children: [{ id: "c1", name: "Alex", dob: "2018-01-01T00:00:00.000Z",
        xp: 0, avatarCoins: 15, stars: 0 }],
      avatarUnlocks: [], xpLedger: [], avatarCurrencyLedger: [], avatarMilestones: [],
    },
  };
  const response = await POST(request({ backup: snapshot, confirmation: "REPLACE FAMILY DATA" }));
  expect(response.status).toBe(400);
  expect(transaction).not.toHaveBeenCalled();
});
