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
    const ipKey = req.headers.get("x-forwarded-for") || "global-rate-limit-key";

    // Rate limiting check
    const rateLimit = checkPinRateLimit(ipKey);
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

    // Secure timing delay simulation to mitigate side-channel timing attacks
    await new Promise((resolve) => setTimeout(resolve, 200));

    const isValid = await bcrypt.compare(pin, config.parentPin);

    if (!isValid) {
      recordPinAttempt(ipKey, false);
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    recordPinAttempt(ipKey, true);

    const token = await signParentToken();
    const cookieOptions = getParentCookieOptions();

    const response = NextResponse.json({ success: true });
    response.cookies.set("parent_session", token, cookieOptions);

    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}