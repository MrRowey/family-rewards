import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ configured: vi.fn(), findChild: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { familyConfig: { findFirst: mocks.configured }, child: { findUnique: mocks.findChild } },
}));
vi.mock("@/lib/kiosk-session", () => ({
  signKioskChildSession: mocks.token,
  KIOSK_CHILD_COOKIE: "kiosk_child_session",
  kioskSessionCookieOptions: { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 },
}));
import { POST } from "@/app/api/kiosk/select-child/route";
const childId = "11111111-1111-4111-8111-111111111111";
const makeRequest = (id = childId) => new Request("http://localhost/api/kiosk/select-child", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ childId: id }),
});
describe("kiosk child selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockResolvedValue({ isConfigured: true });
    mocks.findChild.mockResolvedValue({ id: childId });
    mocks.token.mockResolvedValue("signed-test-session");
  });
  it("rejects invalid or unknown child identities", async () => {
    expect((await POST(makeRequest("not-a-uuid"))).status).toBe(400);
    mocks.findChild.mockResolvedValue(null);
    expect((await POST(makeRequest())).status).toBe(404);
    expect(mocks.token).not.toHaveBeenCalled();
  });
  it("issues a scoped, HTTP-only child cookie after a valid selection", async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("kiosk_child_session=");
    expect(mocks.token).toHaveBeenCalledWith(childId);
  });
});
