import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import {
  signParentToken,
  getParentCookieOptions,
  checkPinRateLimit,
  recordPinAttempt,
  acquirePinVerification,
} from "@/lib/auth";

export async function POST(req: Request) {
  const release = acquirePinVerification();
  if (!release) return NextResponse.json({ error: "PIN verification in progress. Try again." }, { status: 429, headers: { "Retry-After": "1" } });
  try {
    // Global household failure budget.
    const clientIp = "parent-pin-global"; // Do not trust caller-controlled forwarded headers.

    const rateLimit = checkPinRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${rateLimit.retryAfterSec} seconds.` },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec ?? 1) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    const config = await prisma.familyConfig.findFirst();

    if (!config?.isConfigured || !config.parentPin) {
      return NextResponse.json({ error: "Parent PIN not configured" }, { status: 400 });
    }

    // Side-channel timing defense delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const isValid = await compare(pin, config.parentPin);

    if (!isValid) {
      recordPinAttempt(clientIp, false);
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    if (config.parentPinLength === null) {
      await prisma.familyConfig.updateMany({
        where: { id: config.id, parentPin: config.parentPin, parentPinLength: null },
        data: { parentPinLength: pin.length },
      });
    }

    recordPinAttempt(clientIp, true);

    const token = await signParentToken();
    const cookieOptions = getParentCookieOptions();

    const response = NextResponse.json({ success: true });
    response.cookies.set("parent_session", token, cookieOptions);

    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  } finally {
    release();
  }
}