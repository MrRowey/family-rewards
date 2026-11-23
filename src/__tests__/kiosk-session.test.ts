import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieMock = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => {
    const value = cookieMock.cookies.get(name);
    return value ? { value } : undefined;
  } }),
}));

import { signKioskChildSession, hasChildSession, isAuthorisedForChild, KIOSK_CHILD_COOKIE } from "@/lib/kiosk-session";
import { signParentToken } from "@/lib/auth";

describe("signed child kiosk sessions", () => {
  beforeEach(() => {
    cookieMock.cookies.clear();
    process.env.JWT_SECRET = "ci-only-not-for-production-32-character-key";
  });

  it("binds a session to only the selected child", async () => {
    cookieMock.cookies.set(KIOSK_CHILD_COOKIE, await signKioskChildSession("child-one"));
    expect(await hasChildSession("child-one")).toBe(true);
    expect(await hasChildSession("child-two")).toBe(false);
    expect(await isAuthorisedForChild("child-two")).toBe(false);
  });

  it("rejects missing or tampered credentials", async () => {
    expect(await hasChildSession("child-one")).toBe(false);
    cookieMock.cookies.set(KIOSK_CHILD_COOKIE, (await signKioskChildSession("child-one")) + ".tampered");
    expect(await hasChildSession("child-one")).toBe(false);
  });

  it("allows a verified parent session to edit a child's avatar", async () => {
    cookieMock.cookies.set("parent_session", await signParentToken());
    expect(await isAuthorisedForChild("child-two")).toBe(true);
  });
});
