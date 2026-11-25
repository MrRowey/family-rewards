import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyParentToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const token = (await cookies()).get("parent_session")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { await verifyParentToken(token); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const purchases = await prisma.avatarPurchase.findMany({ orderBy: { purchasedAt: "desc" }, take: 200, include: { child: { select: { name: true } } } });
  return NextResponse.json(purchases.map(p => ({ ...p, refundDeadline: null, status: p.refundedAt ? "REFUNDED" : "REFUNDS_UNAVAILABLE" })), { headers: { "Cache-Control": "no-store" } });
}
