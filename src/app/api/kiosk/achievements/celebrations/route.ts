import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAuthorisedForChild } from "@/lib/kiosk-session";
import { COINS_PER_ACHIEVEMENT } from "@/lib/progression";

const payload = z.object({ childId: z.uuid() }).strict();

/** Deliver newly earned badges once, on the child's next profile visit.
 * The conditional write ensures overlapping requests cannot celebrate twice.
 */
export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile selection" }, { status: 400 });
  const { childId } = parsed.data;
  if (!await isAuthorisedForChild(childId)) {
    return NextResponse.json({ error: "Select this child in Family Hub first" }, { status: 403 });
  }
  try {
    const claimed = await prisma.$transaction(async tx => {
      const pending = await tx.childBadge.findMany({
        where: { childId, celebrationSeenAt: null },
        include: { badge: true },
        orderBy: { awardedAt: "asc" },
      });
      if (!pending.length) return [];
      const changed = await tx.childBadge.updateMany({
        where: { id: { in: pending.map(badge => badge.id) }, childId, celebrationSeenAt: null },
        data: { celebrationSeenAt: new Date() },
      });
      if (changed.count !== pending.length) {
        throw new Error("CELEBRATION_CONFLICT");
      }
      return pending.map(item => ({
        id: item.id, title: item.badge.title, icon: item.badge.icon,
      }));
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ achievements: claimed, rewardPerBadge: COINS_PER_ACHIEVEMENT });
  } catch (error) {
    if (error instanceof Error && error.message === "CELEBRATION_CONFLICT") {
      return NextResponse.json({ error: "Achievement notification already claimed" }, { status: 409 });
    }
    console.error("Unable to deliver achievement celebration:", error);
    return NextResponse.json({ error: "Could not check achievement celebrations" }, { status: 503 });
  }
}
