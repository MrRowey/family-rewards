import { cookies } from "next/headers";
import { verifyParentToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";
import { AVATAR_VARIANT_PRICE, variantExists, variantIsFree } from "@/lib/avatar-catalog";

const requestSchema = z.object({ childId: z.uuid(), theme: z.string().min(1), component: z.string().endsWith("Variant"), variant: z.string().min(1) }).strict();

export async function POST(request: Request) {
  try {
    const token = (await cookies()).get("parent_session")?.value;
    if (!token) return NextResponse.json({ error: "Parent approval required." }, { status: 401 });
    try {
      const verified = await verifyParentToken(token);
      if (verified.payload.role !== "parent") return NextResponse.json({ error: "Parent approval required." }, { status: 403 });
    } catch { return NextResponse.json({ error: "Parent session expired." }, { status: 401 }); }
    const { childId, theme, component, variant } = await parseJson(request, requestSchema);
    if (!["sprouts", "bottts", "botttsNeutral", "critters", "voxelBot", "constellation", "planets"].includes(theme)) return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
    if (!variantExists(theme, component, variant)) return NextResponse.json({ error: "Invalid avatar part." }, { status: 400 });
    if (variantIsFree(theme, component, variant)) return NextResponse.json({ error: "This part is already free." }, { status: 400 });
    const result = await prisma.$transaction(async tx => {
      const child = await tx.child.findUnique({ where: { id: childId }, select: { name: true, avatarTheme: true, avatarCoins: true, avatarConfig: true } });
      if (!child || !child.avatarConfig) return { status: 404, error: "Avatar not found." };
      if (child.avatarTheme !== theme) return { status: 403, error: "Only parts from your current theme can be purchased." };
      const existing = await tx.avatarUnlock.findUnique({ where: { childId_theme_component_variant: { childId, theme, component, variant } } });
      if (existing) return { status: 409, error: "You already own this part." };
      const charged = await tx.child.updateMany({ where: { id: childId, avatarCoins: { gte: AVATAR_VARIANT_PRICE } }, data: { avatarCoins: { decrement: AVATAR_VARIANT_PRICE } } });
      if (charged.count !== 1) return { status: 400, error: "Not enough Avatar Coins." };
      const unlock = await tx.avatarUnlock.create({ data: { childId, theme, component, variant, cost: AVATAR_VARIANT_PRICE } });
      await tx.avatarCurrencyLedger.create({ data: { childId, sourceKey: `purchase:${unlock.id}`, delta: -AVATAR_VARIANT_PRICE, reason: "PURCHASE" } });
      await tx.auditLog.create({ data: { actor: child.name, actorType: "CHILD", action: "PURCHASED_AVATAR_PART", details: `${theme} / ${component} / ${variant} for ${AVATAR_VARIANT_PRICE} Avatar Coins` } });
      return { status: 200, coins: child.avatarCoins - AVATAR_VARIANT_PRICE };
    }, { isolationLevel: "Serializable" });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, avatarCoins: result.coins });
  } catch (error) { return apiError(error, "Could not buy avatar part."); }
}
