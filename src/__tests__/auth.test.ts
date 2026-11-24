import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkPinRateLimit, recordPinAttempt, signParentToken, verifyParentToken, getJwtSecret } from "@/lib/auth";

describe("PIN Rate Limiting Logic", () => {
  beforeEach(() => {
    // Reset by recording success
    recordPinAttempt("127.0.0.1", true);
  });

  it("allows initial attempts", () => {
    const status = checkPinRateLimit("127.0.0.1");
    expect(status.allowed).toBe(true);
  });

  it("locks out after 5 consecutive failed attempts", () => {
    for (let i = 0; i < 5; i++) {
      recordPinAttempt("127.0.0.1", false);
    }
    const status = checkPinRateLimit("127.0.0.1");
    expect(status.allowed).toBe(false);
    expect(status.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets failure count on successful attempt", () => {
    recordPinAttempt("127.0.0.1", false);
    recordPinAttempt("127.0.0.1", false);
    recordPinAttempt("127.0.0.1", true);
    const status = checkPinRateLimit("127.0.0.1");
    expect(status.allowed).toBe(true);
  });
});

import { SignJWT } from "jose";

describe("Parent JWT isolation", () => {
  beforeEach(() => vi.stubEnv("JWT_SECRET", "test-only-secret-at-least-32-characters-long"));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a valid parent session", async () => {
    expect((await verifyParentToken(await signParentToken())).payload.role).toBe("parent");
  });

  it.each([
    ["kiosk-child", "family-rewards-kiosk", "HS256"],
    ["kiosk-child", "family-rewards-parent", "HS256"],
    ["parent", "family-rewards-kiosk", "HS256"],
    ["parent", "family-rewards-parent", "HS384"],
  ])("rejects role %s audience %s algorithm %s", async (role, audience, alg) => {
    const token = await new SignJWT({ role }).setProtectedHeader({ alg }).setAudience(audience).setIssuedAt().setExpirationTime("1h").sign(getJwtSecret());
    await expect(verifyParentToken(token)).rejects.toThrow();
  });

  it("rejects legacy tokens without audience", async () => {
    const token = await new SignJWT({ role: "parent" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(getJwtSecret());
    await expect(verifyParentToken(token)).rejects.toThrow();
  });

  it("rejects missing expiry and expired tokens", async () => {
    const jwt = () => new SignJWT({ role: "parent" }).setProtectedHeader({ alg: "HS256" }).setAudience("family-rewards-parent").setIssuedAt();
    await expect(verifyParentToken(await jwt().sign(getJwtSecret()))).rejects.toThrow();
    await expect(verifyParentToken(await jwt().setExpirationTime("1s ago").sign(getJwtSecret()))).rejects.toThrow();
  });
});
