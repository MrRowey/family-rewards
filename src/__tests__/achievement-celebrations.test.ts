import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorised: vi.fn(), pending: vi.fn(), markSeen: vi.fn(),
}));
vi.mock("@/lib/kiosk-session", () => ({ isAuthorisedForChild: mocks.authorised }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    childBadge: { findMany: mocks.pending, updateMany: mocks.markSeen },
  }) },
}));
import { POST } from "@/app/api/kiosk/achievements/celebrations/route";

const childId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";
function request(id: string = childId) {
  return new Request("http://localhost/api/kiosk/achievements/celebrations", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId: id }),
  });
}
describe("one-time child achievement celebrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorised.mockResolvedValue(true);
    mocks.pending.mockResolvedValue([]);
    mocks.markSeen.mockResolvedValue({ count: 1 });
  });
  it("rejects invalid input before accessing private badges", async () => {
    expect((await POST(request("invalid"))).status).toBe(400);
    expect(mocks.authorised).not.toHaveBeenCalled();
    expect(mocks.pending).not.toHaveBeenCalled();
  });
  it("never reveals another child's new badges", async () => {
    mocks.authorised.mockImplementation(async (id: string) => id === childId);
    expect((await POST(request(otherId))).status).toBe(403);
    expect(mocks.pending).not.toHaveBeenCalled();
  });
  it("claims multiple new badges atomically and returns a compact celebration", async () => {
    mocks.pending.mockResolvedValue([
      { id: "a", badge: { title: "First Steps", icon: "🌟" } },
      { id: "b", badge: { title: "High Five", icon: "✋" } },
    ]);
    mocks.markSeen.mockResolvedValue({ count: 2 });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      achievements: [{ title: "First Steps" }, { title: "High Five" }], rewardPerBadge: 5,
    });
    expect(mocks.pending).toHaveBeenCalledWith(expect.objectContaining({
      where: { childId, celebrationSeenAt: null },
    }));
    expect(mocks.markSeen).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ childId, celebrationSeenAt: null }),
      data: { celebrationSeenAt: expect.any(Date) },
    }));
  });
  it("does not replay already delivered achievements", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ achievements: [], rewardPerBadge: 5 });
    expect(mocks.markSeen).not.toHaveBeenCalled();
  });
  it("rejects an overlapping claim instead of returning duplicate celebrations", async () => {
    mocks.pending.mockResolvedValue([{ id: "badge-1", badge: { title: "First Steps", icon: "🌟" } }]);
    mocks.markSeen.mockResolvedValue({ count: 0 });
    const response = await POST(request());
    expect(response.status).toBe(409);
  });
});
