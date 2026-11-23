import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { KIOSK_CHILD_COOKIE, kioskSessionCookieOptions, signKioskChildSession } from "@/lib/kiosk-session";

const selection = z.object({ childId: z.uuid() }).strict();

export async function POST(request: Request) {
  const parsed = selection.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid child selection" }, { status: 400 });
  const config = await prisma.familyConfig.findFirst({ select: { isConfigured: true } });
  if (!config?.isConfigured) return NextResponse.json({ error: "Family setup is required" }, { status: 403 });
  const child = await prisma.child.findUnique({ where: { id: parsed.data.childId }, select: { id: true } });
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(KIOSK_CHILD_COOKIE, await signKioskChildSession(child.id), kioskSessionCookieOptions);
  return response;
}
