import { describe, it, expect, beforeEach } from "vitest";
import { checkPinRateLimit, recordPinAttempt } from "@/lib/auth";

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