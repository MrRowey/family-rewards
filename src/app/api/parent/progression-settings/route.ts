import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyParentToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const settings = z.object({
  xpMinMultiplier: z.number().int().min(1).max(100),
  xpMaxMultiplier: z.number().int().min(1).max(100),
  coinsPerLevel: z.number().int().min(0).max(1000),
  milestoneBonusCoins: z.number().int().min(0).max(5000),
}).strict().refine(value => value.xpMinMultiplier <= value.xpMaxMultiplier, {
  message: "Minimum XP multiplier must not exceed the maximum.",
});
async function authorised() {
  const token = (await cookies()).get("parent_session")?.value;
  if (!token) return false;
  try { return (await verifyParentToken(token)).payload.role === "parent"; }
  catch { return false; }
}

export async function GET() {
  if (!await authorised()) return NextResponse.json({ error: "Parent PIN required" }, { status: 401 });
  const config = await prisma.familyConfig.findFirst({ select: {
    xpMinMultiplier: true, xpMaxMultiplier: true, coinsPerLevel: true, milestoneBonusCoins: true,
  } });
  return NextResponse.json(config || { xpMinMultiplier: 5, xpMaxMultiplier: 8, coinsPerLevel: 25, milestoneBonusCoins: 50 });
}

export async function PATCH(request: Request) {
  if (!await authorised()) return NextResponse.json({ error: "Parent PIN required" }, { status: 401 });
  const parsed = settings.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid XP or coin configuration" }, { status: 400 });
  const current = await prisma.familyConfig.findFirst({ select: { id: true } });
  if (!current) return NextResponse.json({ error: "Family not configured" }, { status: 409 });
  await prisma.familyConfig.update({ where: { id: current.id }, data: parsed.data });
  await prisma.auditLog.create({ data: {
    actor: "Parent", actorType: "PARENT", action: "CHANGED_PROGRESSION_SETTINGS",
    details: `New chore XP multiplier range ${parsed.data.xpMinMultiplier}–${parsed.data.xpMaxMultiplier}; coins per level ${parsed.data.coinsPerLevel}; milestone bonus ${parsed.data.milestoneBonusCoins}. Prospective only.`,
  } });
  return NextResponse.json({ success: true, ...parsed.data });
}
