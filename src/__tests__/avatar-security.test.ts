import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  childFind: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
  validateUnlocks: vi.fn(),
  validateOwnership: vi.fn(),
  cookieGet: vi.fn(),
  verifyToken: vi.fn(),
  authorised: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: { findUnique: mocks.childFind },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ child: { updateMany: mocks.updateMany }, auditLog: { create: mocks.auditCreate } }),
  },
}));
vi.mock("@/lib/domain/avatar-appearance", async () => {
  const { z } = await import("zod");
  return {
    avatarAppearance: z.object({ theme: z.string(), config: z.object({ options: z.record(z.string(), z.array(z.string())).optional() }) }),
    validateAvatarUnlocks: mocks.validateUnlocks,
    validateAvatarOwnership: mocks.validateOwnership,
  };
});
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookieGet }) }));
vi.mock("@/lib/auth", () => ({ verifyParentToken: mocks.verifyToken }));
vi.mock("@/lib/kiosk-session", () => ({ isAuthorisedForChild: mocks.authorised }));

import { PATCH } from "@/app/api/children/[id]/avatar/route";

const context = { params: Promise.resolve({ id: "child-1" }) };
const request = (theme: string) => new Request("http://localhost/api/children/child-1/avatar", {
  method: "PATCH", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ theme, config: { options: {} } }),
});

describe("avatar appearance write security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.childFind.mockResolvedValue({ name: "Child", dob: new Date("2020-01-01"), avatarTheme: "bottts", avatarConfig: "{}" });
    mocks.authorised.mockResolvedValue(true);
    mocks.validateUnlocks.mockResolvedValue(true);
    mocks.validateOwnership.mockResolvedValue(true);
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects edits when the child session does not match the requested profile", async () => {
    mocks.authorised.mockResolvedValue(false);
    const response = await PATCH(request("bottts"), context);
    expect(response.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a child changing themes without parent authorization", async () => {
    mocks.cookieGet.mockReturnValue(undefined);
    const response = await PATCH(request("sprouts"), context);
    expect(response.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("allows a child aged eight or older to change themes with a matching child session", async () => {
    mocks.childFind.mockResolvedValue({
      name: "Older Child", dob: new Date("2010-01-01"), avatarTheme: "bottts", avatarConfig: "{}",
    });
    const response = await PATCH(request("sprouts"), context);
    expect(response.status).toBe(200);
    expect(mocks.verifyToken).not.toHaveBeenCalled();
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ actorType: "CHILD" }),
    }));
  });

  it("rejects unowned parts before saving", async () => {
    mocks.validateOwnership.mockResolvedValue(false);
    const response = await PATCH(request("bottts"), context);
    expect(response.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale writes and does not record a false audit event", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await PATCH(request("bottts"), context);
    expect(response.status).toBe(409);
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ avatarTheme: "bottts" }),
    }));
  });

  it("saves and audits a current-theme update", async () => {
    const response = await PATCH(request("bottts"), context);
    expect(response.status).toBe(200);
    expect(mocks.auditCreate).toHaveBeenCalledTimes(1);
  });
});
