import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { achievementStats } from "@/lib/domain/achievements";
import { ACHIEVEMENTS, getProgress } from "@/lib/progression";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const child = await prisma.child.findUnique({
    where: { id },
    select: { xp: true, avatarCoins: true, badges: { include: { badge: true } } },
  });
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  const stats = await prisma.$transaction(tx => achievementStats(tx, id));
  const owned = new Set(child.badges.map(item => item.badge.title));
  return NextResponse.json({
    progress: getProgress(child.xp),
    avatarCoins: child.avatarCoins,
    stats,
    achievements: ACHIEVEMENTS.map(item => ({
      ...item,
      unlocked: owned.has(item.title),
      current: Math.min(stats[item.ruleType], item.threshold),
    })),
  });
}
