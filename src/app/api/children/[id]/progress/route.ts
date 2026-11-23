import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { achievementStats } from "@/lib/domain/achievements";
import { ACHIEVEMENTS, COINS_PER_ACHIEVEMENT, getProgress } from "@/lib/progression";
import { isAuthorisedForChild } from "@/lib/kiosk-session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!await isAuthorisedForChild(id)) return NextResponse.json({ error: "Select this child from the Family Hub first" }, { status: 403 });
  const child = await prisma.child.findUnique({
    where: { id },
    select: { xp: true, avatarCoins: true, avatarTheme: true, badges: { include: { badge: true } } },
  });
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  const [stats, settings] = await Promise.all([
    prisma.$transaction(tx => achievementStats(tx, id)),
    prisma.familyConfig.findFirst({ select: {
      xpMinMultiplier: true, xpMaxMultiplier: true, coinsPerLevel: true, milestoneBonusCoins: true,
    } }),
  ]);
  const owned = new Set(child.badges.map(item => item.badge.title));
  return NextResponse.json({
    progress: getProgress(child.xp),
    avatarCoins: child.avatarCoins,
    avatarTheme: child.avatarTheme,
    rules: {
      xpMinMultiplier: settings?.xpMinMultiplier ?? 5,
      xpMaxMultiplier: settings?.xpMaxMultiplier ?? 8,
      coinsPerLevel: settings?.coinsPerLevel ?? 25,
      milestoneBonusCoins: settings?.milestoneBonusCoins ?? 50,
      coinsPerAchievement: COINS_PER_ACHIEVEMENT,
    },
    stats,
    achievements: ACHIEVEMENTS.map(item => ({
      ...item,
      unlocked: owned.has(item.title),
      current: Math.min(stats[item.ruleType], item.threshold),
    })),
  });
}
