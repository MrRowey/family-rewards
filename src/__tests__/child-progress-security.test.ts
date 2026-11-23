import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authorised: vi.fn(), childFind: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/kiosk-session", () => ({ isAuthorisedForChild: mocks.authorised }));
vi.mock("@/lib/prisma", () => ({
  prisma: { child: { findUnique: mocks.childFind }, $transaction: mocks.transaction },
}));
import { GET } from "@/app/api/children/[id]/progress/route";

const ctx = { params: Promise.resolve({ id: "child-1" }) };
describe("child progress access", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("rejects a mismatched kiosk profile before reading XP or coin balances", async () => {
    mocks.authorised.mockResolvedValue(false);
    expect((await GET(new Request("http://localhost/api/children/child-1/progress"), ctx)).status).toBe(403);
    expect(mocks.childFind).not.toHaveBeenCalled();
  });
});
