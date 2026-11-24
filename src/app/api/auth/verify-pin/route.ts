import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { signParentToken, getParentCookieOptions, acquirePinVerification } from "@/lib/auth";

export async function POST(req: Request) {
  const release = acquirePinVerification();
  if (!release) return NextResponse.json({ error: "PIN verification in progress. Try again." }, { status: 429, headers: { "Retry-After": "1" } });
  try {
    const body = await req.json().catch(() => null);
    const pin = body?.pin;
    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }
    // Serialize across processes as well as within the current application.
    // Returning an invalid-PIN response commits the failure counter.
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(7261203)`;
      const config = await tx.familyConfig.findFirst();
      if (!config?.isConfigured || !config.parentPin) {
        return NextResponse.json({ error: "Parent PIN not configured" }, { status: 400 });
      }
      const now = Date.now();
      if (config.parentPinLockedUntil && config.parentPinLockedUntil.getTime() > now) {
        const retry = Math.ceil((config.parentPinLockedUntil.getTime() - now) / 1000);
        return NextResponse.json({ error: `Too many failed attempts. Try again in ${retry} seconds.` }, { status: 429, headers: { "Retry-After": String(retry) } });
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      const valid = await compare(pin, config.parentPin);
      const failures = (config.parentPinLockedUntil ? 0 : config.parentPinFailures) + 1;
      const updated = await tx.familyConfig.updateMany({
        where: { id: config.id, parentPin: config.parentPin },
        data: valid ? {
          parentPinFailures: 0, parentPinLockedUntil: null,
          parentPinLength: config.parentPinLength ?? pin.length,
        } : {
          parentPinFailures: failures,
          parentPinLockedUntil: failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });
      if (updated.count !== 1) return NextResponse.json({ error: "PIN changed. Try again." }, { status: 409 });
      if (!valid) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
      const response = NextResponse.json({ success: true });
      response.cookies.set("parent_session", await signParentToken(config.parentPin), getParentCookieOptions());
      return response;
    }, { timeout: 10000 });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  } finally {
    release();
  }
}
