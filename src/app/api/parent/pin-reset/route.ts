import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { verifyParentToken, getParentCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("parent_session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const newPin = body?.newPin;
    if (typeof newPin !== "string" || !/^\d{4,8}$/.test(newPin)) {
      return NextResponse.json({ error: "PIN must be between 4 and 8 digits" }, { status: 400 });
    }
    const newHash = await hash(newPin, 12);
    return await prisma.$transaction(async (tx) => {
      // Share the login lock so PIN verification and reset cannot interleave.
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(7261203)`;
      const config = await tx.familyConfig.findFirst();
      if (!config?.isConfigured || !config.parentPin) {
        return NextResponse.json({ error: "System config not found" }, { status: 404 });
      }
      // Recheck inside the lock: a previous reset may have revoked this session.
      try {
        await verifyParentToken(token, config);
      } catch {
        return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
      }
      const updated = await tx.familyConfig.updateMany({
        where: { id: config.id, parentPin: config.parentPin, isConfigured: true },
        data: { parentPin: newHash, parentPinLength: newPin.length, parentPinFailures: 0, parentPinLockedUntil: null },
      });
      if (updated.count !== 1) return NextResponse.json({ error: "PIN changed. Sign in again." }, { status: 409 });
      await tx.auditLog.create({
        data: {
          actor: "Parent",
          actorType: "PARENT",
          action: "RESET_PIN",
          details: "Parent security PIN was successfully changed",
        },
      });
      const response = NextResponse.json({ success: true, requiresLogin: true });
      response.cookies.set("parent_session", "", { ...getParentCookieOptions(), maxAge: 0 });
      return response;
    }, { timeout: 10000 });
  } catch {
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}
