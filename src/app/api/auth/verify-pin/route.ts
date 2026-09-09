import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-home-kiosk-secret-key-change-me"
);

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();
    const config = await prisma.familyConfig.findFirst();

    if (!config || !config.parentPin) {
      return NextResponse.json({ error: "Parent PIN not configured" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(pin, config.parentPin).catch(() => pin === config.parentPin);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const token = await new SignJWT({ role: "parent" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("4h")
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });
    response.cookies.set("parent_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}