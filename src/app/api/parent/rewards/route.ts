// Parent-only access is enforced by src/proxy.ts.
export { GET } from "../../rewards/route";

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let input: unknown;
  try { input = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Invalid prize details" }, { status: 400 });
  }
  const data = input as Record<string, unknown>;
  const category = data.category;
  if (category !== undefined && (typeof category !== "string" || category.trim().length > 60)) {
    return NextResponse.json({ error: "Category must be at most 60 characters." }, { status: 400 });
  }
  const imageURL = data.imageURL;
  if (imageURL !== undefined && (typeof imageURL !== "string" || !/^\/api\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(imageURL))) {
    return NextResponse.json({ error: "Upload a valid prize photo." }, { status: 400 });
  }
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const icon = typeof data.icon === "string" ? data.icon.trim() : "🎁";
  if (!title || title.length > 150 || description.length > 1000 || !icon || icon.length > 20 ||
      typeof data.starCost !== "number" || !Number.isSafeInteger(data.starCost) || data.starCost < 1 || data.starCost > 1000000 ||
      typeof data.monthlyStock !== "number" || !Number.isSafeInteger(data.monthlyStock) || data.monthlyStock < 1 || data.monthlyStock > 1000000 ||
      (data.isGroup !== undefined && typeof data.isGroup !== "boolean")) {
    return NextResponse.json({ error: "Enter a valid title, cost and stock (at least 1)" }, { status: 400 });
  }
  try {
    const reward = await prisma.reward.create({ data: {
      title, description: description || null, icon, imageURL, category: category?.trim() || null,
      starCost: data.starCost, monthlyStock: data.monthlyStock, currentStock: data.monthlyStock,
      isGroup: data.isGroup === true,
    } });
    return NextResponse.json(reward, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save prize" }, { status: 500 });
  }
}

const updatePrize = z.object({
  id: z.string().uuid(),
  icon: z.string().trim().min(1).max(20).optional(),
  expectedCurrentStock: z.number().int().min(0).max(1000000).optional(),
  isVisible: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  category: z.string().trim().max(60).nullable().optional(),
  imageURL: z.string().regex(/^\/api\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/).nullable().optional(),
  starCost: z.number().int().min(1).max(1000000).optional(),
  monthlyStock: z.number().int().min(1).max(1000000).optional(),
  currentStock: z.number().int().min(0).max(1000000).optional(),
}).strict();

export async function PATCH(req: Request) {
  const input = updatePrize.safeParse(await req.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter valid prize details." }, { status: 400 });

  try {
    const { id, expectedCurrentStock, ...data } = input.data;
    if (Object.keys(data).length === 0) return NextResponse.json({ error: "Choose a change to save." }, { status: 400 });
    if (data.currentStock !== undefined && expectedCurrentStock === undefined) return NextResponse.json({ error: "Refresh inventory before adjusting available stock." }, { status: 400 });
    return await prisma.$transaction(async tx => {
      const existing = await tx.reward.findUnique({ where: { id } });
      if (!existing || (data.isVisible !== undefined && existing.isGroup)) return NextResponse.json({ error: "Prize not found." }, { status: 404 });
      if (data.currentStock !== undefined && existing.currentStock !== expectedCurrentStock) return NextResponse.json({ error: "Stock changed since you opened the editor. Refresh and try again." }, { status: 409 });
      if (data.starCost !== undefined && data.starCost !== existing.starCost) {
        // Preserve the effective original price of legacy claims before changing it.
        await tx.rewardRedemption.updateMany({ where: { rewardId: id, starCostAtClaim: null }, data: { starCostAtClaim: existing.starCost } });
      }
      const reward = await tx.reward.update({ where: { id }, data });
      await tx.auditLog.create({ data: { actor: "Parent", actorType: "PARENT", action: "UPDATED_REWARD", details: `Updated reward "${existing.title}": ${Object.keys(data).join(", ")}.` } });
      return NextResponse.json(reward);
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return NextResponse.json({ error: "Inventory changed. Refresh and try again." }, { status: 409 });
    return NextResponse.json({ error: "Unable to update prize." }, { status: 500 });
  }
}
