import { describe, it, expect, beforeEach, beforeAll } from "vitest";

// Ensure process.env.JWT_SECRET is populated before importing auth.ts
process.env.JWT_SECRET = "test-secret-key-that-is-at-least-32-characters-long!";

import { checkPinRateLimit, recordPinAttempt } from "@/lib/auth";

describe("PIN Rate Limiting Logic", () => {
  const testIp = "192.168.1.100";

  beforeEach(() => {
    // Reset rate limiter state with a successful attempt
    recordPinAttempt(testIp, true);
  });

  it("allows initial attempts", () => {
    const status = checkPinRateLimit(testIp);
    expect(status.allowed).toBe(true);
  });

  it("locks out after 5 consecutive failed attempts", () => {
    for (let i = 0; i < 5; i++) {
      recordPinAttempt(testIp, false);
    }

    const status = checkPinRateLimit(testIp);
    expect(status.allowed).toBe(false);
    expect(status.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets failure count on successful attempt", () => {
    for (let i = 0; i < 3; i++) {
      recordPinAttempt(testIp, false);
    }

    recordPinAttempt(testIp, true);

    const status = checkPinRateLimit(testIp);
    expect(status.allowed).toBe(true);
  });
});