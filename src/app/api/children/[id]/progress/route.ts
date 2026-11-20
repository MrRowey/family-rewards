import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS, getProgress } from "@/lib/progression";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const child = await prisma.child.findUnique({
    where: { id },
    select: { xp: true, avatarCoins: true, badges: { include: { badge: true } } },
  });
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
  const approvedCount = await prisma.completion.count({ where: { childId: id, status: "APPROVED" } });
  const owned = new Set(child.badges.map(item => item.badge.title));
  return NextResponse.json({
    progress: getProgress(child.xp),
    avatarCoins: child.avatarCoins,
    achievements: ACHIEVEMENTS.map(item => ({
      ...item,
      unlocked: owned.has(item.title),
      current: Math.min(approvedCount, item.threshold),
    })),
  });
}
