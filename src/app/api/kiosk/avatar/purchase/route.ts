import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";
import { hasChildSession } from "@/lib/kiosk-session";
import { AVATAR_VARIANT_PRICE, variantExists, variantIsFree } from "@/lib/avatar-catalog";

const requestSchema = z.object({ childId: z.uuid(), theme: z.string().min(1), component: z.string().endsWith("Variant"), variant: z.string().min(1) }).strict();

async function purchaseWithRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await run(); } catch (error) {
      if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2034") throw error;
      if (attempt >= 2) throw new Error("CONCURRENCY_ERROR: Please try again.");
    }
  }
}

export async function POST(request: Request) {
  try {
    const { childId, theme, component, variant } = await parseJson(request, requestSchema);
    if (!await hasChildSession(childId)) return NextResponse.json({ error: "This is not the selected child profile." }, { status: 403 });
    if (!["sprouts", "bottts", "botttsNeutral", "critters", "voxelBot", "constellation", "planets"].includes(theme)) return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
    if (!variantExists(theme, component, variant)) return NextResponse.json({ error: "Invalid avatar part." }, { status: 400 });
    if (variantIsFree(theme, component, variant)) return NextResponse.json({ error: "This part is already free." }, { status: 400 });
    const result = await purchaseWithRetry(() => prisma.$transaction(async tx => {
      const child = await tx.child.findUnique({ where: { id: childId }, select: { name: true, avatarTheme: true, avatarCoins: true, avatarConfig: true } });
      if (!child || !child.avatarConfig) return { status: 404, error: "Avatar not found." };
      if (child.avatarTheme !== theme) return { status: 403, error: "Only parts from your current theme can be purchased." };
      const existing = await tx.avatarUnlock.findUnique({ where: { childId_theme_component_variant: { childId, theme, component, variant } } });
      if (existing) return { status: 409, error: "You already own this part." };
      const charged = await tx.child.updateMany({ where: { id: childId, avatarTheme: theme, avatarConfig: { not: null }, avatarCoins: { gte: AVATAR_VARIANT_PRICE }, avatarCoinDebt: 0 }, data: { avatarCoins: { decrement: AVATAR_VARIANT_PRICE } } });
      if (charged.count !== 1) return { status: 400, error: "Not enough Avatar Coins." };
      const unlock = await tx.avatarUnlock.create({ data: { childId, theme, component, variant, cost: AVATAR_VARIANT_PRICE } });
      await tx.avatarCurrencyLedger.create({ data: { childId, sourceKey: `purchase:${unlock.id}`, delta: -AVATAR_VARIANT_PRICE, reason: "PURCHASE" } });
      await tx.auditLog.create({ data: { actor: child.name, actorType: "CHILD", action: "PURCHASED_AVATAR_PART", details: `${theme} / ${component} / ${variant} for ${AVATAR_VARIANT_PRICE} Avatar Coins` } });
      return { status: 200, coins: child.avatarCoins - AVATAR_VARIANT_PRICE };
    }, { isolationLevel: "Serializable" }));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, avatarCoins: result.coins });
  } catch (error) { return apiError(error, "Could not buy avatar part."); }
}
