import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { POST as purchase } from "@/app/api/kiosk/avatar/purchase/route";
import { POST as avatarRefund } from "@/app/api/parent/avatar-purchases/refund/route";
import { POST as rewardRefund } from "@/app/api/redemptions/refund/route";
import { signKioskChildSession } from "@/lib/kiosk-session";
import { avatarOptions, AVATAR_VARIANT_PRICE as price } from "@/lib/avatar-catalog";
import { validateAvatarOwnership } from "@/lib/domain/avatar-appearance";

const session = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "kiosk_child_session" && session.token ? { value: session.token } : undefined }),
}));
const prefix = "Purchase regression " + randomUUID();
const ids: string[] = [];
const theme = "bottts";
const parts = Object.entries(avatarOptions(theme)).flatMap(([component, spec]) =>
  component.endsWith("Variant") && spec.type === "enum"
    ? (spec.values ?? []).slice(1).map(variant => ({ component, variant })) : []);
type Part = { component: string; variant: string };

async function childWithCoins(coins: number, debt = 0) {
  const child = await prisma.$transaction(async tx => {
    const child = await tx.child.create({ data: { name: prefix, dob: new Date("2016-01-01"), avatarTheme: theme, avatarConfig: "{}", avatarCoins: coins, avatarCoinDebt: debt } });
    await tx.avatarCurrencyLedger.create({ data: { childId: child.id, sourceKey: "test:opening", delta: coins, debtDelta: debt, reason: "TEST" } });
    return child;
  });
  ids.push(child.id);
  session.token = await signKioskChildSession(child.id);
  return child;
}
function buy(childId: string, part: Part) {
  return purchase(new Request("http://localhost/api/kiosk/avatar/purchase", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId, theme, ...part }),
  }));
}
async function verify(childId: string, coins: number, purchases: number, debt = 0) {
  const child = await prisma.child.findUniqueOrThrow({ where: { id: childId } });
  expect(child.avatarCoins).toBe(coins);
  expect(child.avatarCoinDebt).toBe(debt);
  const ledger = await prisma.avatarCurrencyLedger.findMany({ where: { childId } });
  expect(ledger.reduce((sum, row) => sum + row.delta, 0)).toBe(coins);
  expect(ledger.reduce((sum, row) => sum + row.debtDelta, 0)).toBe(debt);
  const history = await prisma.avatarPurchase.findMany({ where: { childId } });
  const unlocks = await prisma.avatarUnlock.findMany({ where: { childId } });
  expect(history).toHaveLength(purchases);
  expect(unlocks).toHaveLength(purchases);
  expect(ledger.filter(row => row.reason === "PURCHASE")).toHaveLength(purchases);
  for (const item of history) {
    expect(item.cost).toBe(price);
    expect(item.refundedAt).toBeNull();
    expect(unlocks).toContainEqual(expect.objectContaining({ id: item.id, cost: price, component: item.component, variant: item.variant, theme }));
    expect(ledger).toContainEqual(expect.objectContaining({ sourceKey: "purchase:" + item.id, delta: -price }));
    expect(await validateAvatarOwnership(childId, theme, { options: { [item.component]: [item.variant] } })).toBe(true);
  }
}
afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actor: prefix } });
  await prisma.child.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

describe("PostgreSQL cosmetic purchase integrity", () => {
  it("charges exactly once for simultaneous duplicate purchases", async () => {
    expect(parts.length).toBeGreaterThanOrEqual(2);
    const child = await childWithCoins(price * 2);
    const responses = await Promise.all([buy(child.id, parts[0]), buy(child.id, parts[0])]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    await verify(child.id, price, 1);
    expect((await buy(child.id, parts[0])).status).toBe(409);
    await verify(child.id, price, 1);
  });

  it("prevents simultaneous purchases overspending a shared balance", async () => {
    const child = await childWithCoins(price);
    const responses = await Promise.all([buy(child.id, parts[0]), buy(child.id, parts[1])]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    await verify(child.id, 0, 1);
  });

  it("rejects purchases with outstanding debt and mismatched sessions", async () => {
    const child = await childWithCoins(price, 1);
    expect((await buy(child.id, parts[0])).status).toBe(400);
    await verify(child.id, price, 0, 1);
    const other = await childWithCoins(price);
    expect((await buy(child.id, parts[0])).status).toBe(403);
    await verify(other.id, price, 0);
  });

  it("rolls back the debit, ownership and history when the ledger insert fails", async () => {
    const child = await childWithCoins(price);
    // A test-only check constraint forces a failure after the debit and history insert.
    // Integration tests run sequentially against a dedicated test database.
    await prisma.$executeRawUnsafe('ALTER TABLE "AvatarCurrencyLedger" ADD CONSTRAINT "test_reject_cosmetic_purchase" CHECK ("reason" <> \'PURCHASE\') NOT VALID');
    try {
      expect((await buy(child.id, parts[0])).status).toBe(500);
      await verify(child.id, price, 0);
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "AvatarCurrencyLedger" DROP CONSTRAINT "test_reject_cosmetic_purchase"');
    }
    expect((await buy(child.id, parts[0])).status).toBe(200);
    await verify(child.id, 0, 1);
  });

  it("keeps both refund execution endpoints disabled", async () => {
    const child = await childWithCoins(price);
    expect((await buy(child.id, parts[0])).status).toBe(200);
    expect((await avatarRefund()).status).toBe(403);
    expect((await rewardRefund()).status).toBe(403);
    await verify(child.id, 0, 1);
  });
});
