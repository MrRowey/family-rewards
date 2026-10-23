import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  signParentToken,
  getParentCookieOptions,
  checkPinRateLimit,
  recordPinAttempt,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // Key rate limiter by IP header or global fallback key
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "global-client-key";

    const rateLimit = checkPinRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${rateLimit.retryAfterSec} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { pin } = body;

    if (typeof pin !== "string" || !/^\d{4,8}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }

    const config = await prisma.familyConfig.findFirst();

    if (!config || !config.parentPin) {
      return NextResponse.json({ error: "Parent PIN not configured" }, { status: 400 });
    }

    // Side-channel timing defense delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const isValid = await bcrypt.compare(pin, config.parentPin);

    if (!isValid) {
      recordPinAttempt(clientIp, false);
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    recordPinAttempt(clientIp, true);

    const token = await signParentToken();
    const cookieOptions = getParentCookieOptions();

    const response = NextResponse.json({ success: true });
    response.cookies.set("parent_session", token, cookieOptions);

    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}