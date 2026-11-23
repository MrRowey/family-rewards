import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorised: vi.fn(), child: vi.fn(), settings: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/kiosk-session", () => ({ isAuthorisedForChild: mocks.authorised }));
vi.mock("@/lib/domain/achievements", () => ({ achievementStats: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { child: { findUnique: mocks.child }, familyConfig: { findFirst: mocks.settings }, $transaction: mocks.transaction },
}));
import { GET } from "@/app/api/children/[id]/progress/route";
const childId = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id: childId }) };
describe("progress and currency rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorised.mockResolvedValue(true);
    mocks.child.mockResolvedValue({
      xp: 20, avatarCoins: 12, avatarTheme: "bottts", badges: [],
    });
    mocks.settings.mockResolvedValue({
      xpMinMultiplier: 7, xpMaxMultiplier: 9, coinsPerLevel: 30, milestoneBonusCoins: 60,
    });
    mocks.transaction.mockResolvedValue({
      TOTAL_TASKS: 0, STARS_EARNED: 0, REWARDS_REDEEMED: 0, STREAK_DAYS: 0,
    });
  });
  it("returns the actual parent-configured earnings instead of stale help text", async () => {
    const response = await GET(new Request("http://localhost"), ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.avatarTheme).toBe("bottts");
    expect(body.avatarCoins).toBe(12);
    expect(body.rules).toEqual({
      xpMinMultiplier: 7, xpMaxMultiplier: 9, coinsPerLevel: 30,
      milestoneBonusCoins: 60, coinsPerAchievement: 5,
    });
    expect(body.progress).toMatchObject({ level: 1, current: 20 });
  });
  it("blocks a mismatched child session before fetching XP or account settings", async () => {
    mocks.authorised.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost"), ctx)).status).toBe(403);
    expect(mocks.child).not.toHaveBeenCalled();
    expect(mocks.settings).not.toHaveBeenCalled();
  });
});
