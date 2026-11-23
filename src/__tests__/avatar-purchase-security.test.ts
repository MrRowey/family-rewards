import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(), verifyToken: vi.fn(), kioskSession: vi.fn(), findChild: vi.fn(), findUnlock: vi.fn(),
  updateMany: vi.fn(), unlockCreate: vi.fn(), auditCreate: vi.fn(), currencyLedgerCreate: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet }) }));
vi.mock("@/lib/auth", () => ({ verifyParentToken: mocks.verifyToken }));
vi.mock("@/lib/kiosk-session", () => ({ hasChildSession: mocks.kioskSession }));
vi.mock("@/lib/avatar-catalog", () => ({
  AVATAR_VARIANT_PRICE: 10,
  variantExists: (_theme: string, component: string, variant: string) => component === "eyesVariant" && variant === "premium",
  variantIsFree: (_theme: string, _component: string, variant: string) => variant === "free",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ child: { findUnique: mocks.findChild, updateMany: mocks.updateMany },
      avatarUnlock: { findUnique: mocks.findUnlock, create: mocks.unlockCreate },
      auditLog: { create: mocks.auditCreate }, avatarCurrencyLedger: { create: mocks.currencyLedgerCreate } }) },
}));
import { POST } from "@/app/api/kiosk/avatar/purchase/route";

const request = (overrides = {}) => new Request("http://localhost/api/kiosk/avatar/purchase", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ childId: "11111111-1111-4111-8111-111111111111", theme: "bottts", component: "eyesVariant", variant: "premium", ...overrides }),
});

describe("avatar purchase security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue({ value: "valid-token" });
    mocks.verifyToken.mockResolvedValue({ payload: { role: "parent" } });
    mocks.kioskSession.mockResolvedValue(true);
    mocks.findChild.mockResolvedValue({ name: "Child", avatarTheme: "bottts", avatarCoins: 20, avatarConfig: "{}" });
    mocks.findUnlock.mockResolvedValue(null);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.unlockCreate.mockResolvedValue({ id: "unlock-1" });
  });

  it("requires a parent session", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a token without the parent role", async () => {
    mocks.verifyToken.mockResolvedValue({ payload: { role: "child" } });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects mismatched kiosk child sessions", async () => {
    mocks.kioskSession.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid cosmetic", async () => {
    expect((await POST(request({ variant: "made-up" }))).status).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a purchase for a different theme", async () => {
    mocks.findChild.mockResolvedValue({ name: "Child", avatarTheme: "sprouts", avatarCoins: 20, avatarConfig: "{}" });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects duplicate ownership without charging", async () => {
    mocks.findUnlock.mockResolvedValue({ id: "existing" });
    expect((await POST(request())).status).toBe(409);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("does not create ownership when the conditional debit fails", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    expect((await POST(request())).status).toBe(400);
    expect(mocks.unlockCreate).not.toHaveBeenCalled();
  });

  it("charges once and records ownership and audit in the transaction", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, avatarCoins: 10 });
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ avatarCoins: { gte: 10 } }),
      data: { avatarCoins: { decrement: 10 } },
    }));
    expect(mocks.unlockCreate).toHaveBeenCalledTimes(1);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });
});
