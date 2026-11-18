import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";

const keySchema = z.object({
  childId: z.string().min(1).max(100),
  year: z.coerce.number().int().min(2000).max(9999),
  month: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: Request) {
  try {
    const key = keySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!key.success) return NextResponse.json({ error: "Choose a child and month." }, { status: 400 });
    const plan = await prisma.shopPlan.findUnique({ where: { childId_year_month: key.data } });
    return NextResponse.json({ rewardIds: plan?.rewardIds ?? null });
  } catch (error) {
    return apiError(error, "Could not load the shop plan.");
  }
}

export async function PUT(request: Request) {
  try {
    const { rewardIds, ...key } = await parseJson(request, keySchema.extend({
      rewardIds: z.array(z.string().min(1).max(100)).max(1000).nullable(),
    }));
    const where = { childId_year_month: key };
    if (rewardIds === null) {
      await prisma.shopPlan.deleteMany({ where: key });
      return NextResponse.json({ rewardIds: null });
    }
    const ids = [...new Set(rewardIds)];
    const count = await prisma.reward.count({ where: { id: { in: ids }, isGroup: false, isArchived: false } });
    if (count !== ids.length) return NextResponse.json({ error: "Choose existing shop prizes." }, { status: 400 });
    const plan = await prisma.shopPlan.upsert({
      where, create: { ...key, rewardIds: ids }, update: { rewardIds: ids },
    });
    return NextResponse.json({ rewardIds: plan.rewardIds });
  } catch (error) {
    return apiError(error, "Could not save the shop plan.");
  }
}
