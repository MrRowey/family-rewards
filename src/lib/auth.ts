import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET_VAL = process.env.JWT_SECRET;

if (!JWT_SECRET_VAL || JWT_SECRET_VAL.length < 32) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable must be set and be at least 32 characters long."
  );
}

export const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_VAL);

// Session duration: 4 hours
export const SESSION_MAX_AGE = 4 * 60 * 60;

export async function signParentToken(): Promise<string> {
    return new SignJWT({ role: "parent"})
        .setProtectedHeader({ alg: "HS256"})
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(JWT_SECRET);
}

export async function verifyParentToken(token: string) {
  return await jwtVerify(token, JWT_SECRET);
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
    // Lockout expired, reset attempts
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