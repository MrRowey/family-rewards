import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifyParentToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";
import { avatarOptions, variantIsFree } from "@/lib/avatar-catalog";
import { avatarAppearance } from "@/lib/domain/avatar-appearance";
import { creditAvatarCoins } from "@/lib/domain/avatar-currency";

const schema = z.object({ purchaseId: z.uuid() }).strict();
export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("parent_session")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { await verifyParentToken(token); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    const { purchaseId } = await parseJson(req, schema);
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(async tx => {
          const purchase = await tx.avatarPurchase.findUnique({ where: { id: purchaseId } });
          if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
          await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${purchase.childId} FOR UPDATE`;
          const now = new Date();
          if (purchase.refundedAt || now.getTime() >= purchase.purchasedAt.getTime() + 14 * 86400000 || purchase.cost <= 0) return NextResponse.json({ error: "Purchase is no longer refundable" }, { status: 409 });
          const child = await tx.child.findUniqueOrThrow({ where: { id: purchase.childId } });
          const unlock = await tx.avatarUnlock.findUnique({ where: { id: purchase.id } });
          if (!unlock || unlock.childId !== purchase.childId || unlock.theme !== purchase.theme || unlock.component !== purchase.component || unlock.variant !== purchase.variant || unlock.cost !== purchase.cost) return NextResponse.json({ error: "Purchase ownership no longer matches" }, { status: 409 });
          let replacement: string | undefined;
          if (child.avatarTheme === purchase.theme && child.avatarConfig) {
            const parsed = avatarAppearance.safeParse({ theme: child.avatarTheme, config: JSON.parse(child.avatarConfig) });
            if (!parsed.success) return NextResponse.json({ error: "Repair avatar before refunding" }, { status: 409 });
            const config = parsed.data.config;
            const selected = config.options?.[purchase.component];
            if (Array.isArray(selected) && selected[0] === purchase.variant) {
              const free = avatarOptions(purchase.theme)[purchase.component]?.values?.[0];
              if (!free || !variantIsFree(purchase.theme, purchase.component, free)) return NextResponse.json({ error: "No safe replacement available" }, { status: 409 });
              config.options = { ...config.options, [purchase.component]: [free] };
              replacement = JSON.stringify(config);
            }
          }
          const marked = await tx.avatarPurchase.updateMany({ where: { id: purchase.id, refundedAt: null, purchasedAt: { gt: new Date(now.getTime() - 14 * 86400000) } }, data: { refundedAt: now } });
          if (marked.count !== 1) return NextResponse.json({ error: "Purchase is no longer refundable" }, { status: 409 });
          await tx.avatarUnlock.delete({ where: { id: unlock.id } });
          const credited = await creditAvatarCoins(tx, purchase.childId, `refund:${purchase.id}`, purchase.cost, "COSMETIC_REFUND");
          if (replacement !== undefined) await tx.child.update({ where: { id: child.id }, data: { avatarConfig: replacement } });
          await tx.auditLog.create({ data: { actor: "Parent", actorType: "PARENT", action: "REFUNDED_AVATAR_PART", details: `${child.name}: ${purchase.id} / ${purchase.theme} / ${purchase.component} / ${purchase.variant}; ${purchase.cost} coins refunded` } });
          return NextResponse.json({ success: true, refundedCoins: purchase.cost, creditedCoins: credited, debtPaid: purchase.cost - credited });
        }, { isolationLevel: "Serializable" });
      } catch (error) {
        if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2034") throw error;
        if (attempt >= 2) throw new Error("CONCURRENCY_ERROR: Please try again.");
      }
    }
  } catch (error) { return apiError(error, "Could not refund avatar purchase."); }
}
