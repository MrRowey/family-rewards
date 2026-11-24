import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getJwtSecret, verifyParentToken } from "@/lib/auth";

const COOKIE = "kiosk_child_session";
const SESSION_SECONDS = 60 * 60;

export async function signKioskChildSession(childId: string) {
  return new SignJWT({ role: "kiosk-child", childId })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("family-rewards-kiosk")
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getJwtSecret());
}

export const kioskSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};

/** The URL/body childId is never trusted without matching the signed cookie.
 *  This is a shared-home kiosk: picking a public child profile issues a session,
 *  it is NOT a substitute for a per-child password in an untrusted environment.
 */
export async function hasChildSession(childId: string): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { audience: "family-rewards-kiosk", algorithms: ["HS256"], requiredClaims: ["exp", "iat"], maxTokenAge: SESSION_SECONDS });
    return payload.role === "kiosk-child" && payload.childId === childId;
  } catch { return false; }
}

export async function isAuthorisedForChild(childId: string): Promise<boolean> {
  const parentToken = (await cookies()).get("parent_session")?.value;
  if (parentToken) {
    try {
      const { payload } = await verifyParentToken(parentToken);
      if (payload.role === "parent") return true;
    } catch { /* expired parent session; fall back to kiosk */ }
  }
  return hasChildSession(childId);
}

export { COOKIE as KIOSK_CHILD_COOKIE };
