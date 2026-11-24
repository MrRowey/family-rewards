import { SignJWT, jwtVerify } from "jose";
import { createHmac, timingSafeEqual } from "node:crypto";

function credentialBinding(pinHash: string): string {
  return createHmac("sha256", getJwtSecret()).update("parent-session-v1:").update(pinHash).digest("hex");
}

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET environment variable must be set and be at least 32 characters long."
    );
  }
  return new TextEncoder().encode(secret);
}

// Session duration: 4 hours
export const SESSION_MAX_AGE = 4 * 60 * 60;

export async function signParentToken(pinHash: string): Promise<string> {
  return new SignJWT({ role: "parent", credential: credentialBinding(pinHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("family-rewards-parent")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getJwtSecret());
}

export async function verifyParentToken(token: string) {
  const result = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
    audience: "family-rewards-parent",
    requiredClaims: ["exp", "iat"],
    maxTokenAge: SESSION_MAX_AGE,
  });
  if (result.payload.role !== "parent") throw new Error("Invalid parent role");
  const binding = result.payload.credential;
  if (typeof binding !== "string" || !/^[a-f0-9]{64}$/.test(binding)) throw new Error("Missing credential binding");
  const { prisma } = await import("@/lib/prisma");
  const config = await prisma.familyConfig.findFirst({ select: { parentPin: true, isConfigured: true } });
  if (!config?.isConfigured || !config.parentPin || !timingSafeEqual(Buffer.from(binding, "hex"), Buffer.from(credentialBinding(config.parentPin), "hex"))) {
    throw new Error("Parent session revoked");
  }
  return result;
}

export function getParentCookieOptions() {
  const isSecure = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

// Simple in-memory rate limiter for PIN verification attempts
interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}

const pinAttemptsMap = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkPinRateLimit(ipKey: string): { allowed: boolean; retryAfterSec?: number } {
  const record = pinAttemptsMap.get(ipKey);
  const now = Date.now();

  if (!record) {
    return { allowed: true };
  }

  if (record.lockoutUntil > now) {
    const retryAfterSec = Math.ceil((record.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSec };
  }

  if (record.lockoutUntil <= now && record.attempts >= MAX_ATTEMPTS) {
    pinAttemptsMap.delete(ipKey);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordPinAttempt(ipKey: string, success: boolean): void {
  const now = Date.now();
  const record = pinAttemptsMap.get(ipKey) || { attempts: 0, lockoutUntil: 0 };

  if (success) {
    pinAttemptsMap.delete(ipKey);
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockoutUntil = now + LOCKOUT_DURATION_MS;
  }
  pinAttemptsMap.set(ipKey, record);
}

// Single-flight PIN verification prevents concurrent requests from bypassing
// the global failure budget in the supported single-process deployment.
let pinVerificationActive = false;
export function acquirePinVerification(): (() => void) | null {
  if (pinVerificationActive) return null;
  pinVerificationActive = true;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pinVerificationActive = false;
  };
}
