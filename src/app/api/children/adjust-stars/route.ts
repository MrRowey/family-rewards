import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const AdjustStarsSchema = z.object({
  childId: z.string().min(1),
  amount: z.number().int().finite().min(-100000).max(100000).refine((n) => n !== 0),
  reason: z.string().trim().min(1).max(500),
});

export async function POST(req: Request) {
  const parsed = AdjustStarsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid star adjustment", details: parsed.error.issues }, { status: 400 });
  }
  const { childId, amount, reason } = parsed.data;
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const updated = await prisma.$transaction(async (tx) => {
          const child = await tx.child.findUnique({ where: { id: childId } });
          if (!child) return null;
          const newStars = Math.max(0, child.stars + amount);
          const result = await tx.child.update({
            where: { id: childId },
            data: { stars: newStars },
          });
          await tx.auditLog.create({
            data: {
              actor: "Parent", actorType: "PARENT", action: "ADJUSTED_STARS",
              details: `Adjusted stars for ${child.name} by ${amount > 0 ? "+" : ""}${amount} (${reason}). New balance: ${newStars}`,
            },
          });
          return result;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        if (!updated) return NextResponse.json({ error: "Child not found" }, { status: 404 });
        return NextResponse.json(updated);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
        throw error;
      }
    }
  } catch (error) {
    console.error("Failed to adjust stars:", error);
    return NextResponse.json({ error: "Failed to adjust stars" }, { status: 500 });
  }
  return NextResponse.json({ error: "Concurrent adjustment failed" }, { status: 409 });
}
