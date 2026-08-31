import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rewardId, childId } = body;

    if (!rewardId || !childId) {
      return NextResponse.json({ error: "rewardId and childId are required" }, { status: 400 });
    }

    const existing = await prisma.rewardAssignment.findFirst({
      where: { rewardId, childId },
    });

    if (existing) {
      await prisma.rewardAssignment.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed" });
    }

    const assignment = await prisma.rewardAssignment.create({
      data: { rewardId, childId },
    });

    return NextResponse.json({ action: "added", assignment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to toggle assignment" }, { status: 500 });
  }
}