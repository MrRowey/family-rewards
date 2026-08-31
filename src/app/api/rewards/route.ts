import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rewards?childId=XYZ
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    const rewards = await prisma.reward.findMany({
      include: {
        assignments: true,
      },
      orderBy: { starCost: "asc" },
    });

    // If childId is specified, return rewards assigned to that child OR default unassigned rewards
    if (childId) {
      const filtered = rewards.filter((r) => {
        if (r.assignments.length === 0) return true; // Available to all if not restricted
        return r.assignments.some((a) => a.childId === childId);
      });
      return NextResponse.json(filtered);
    }

    return NextResponse.json(rewards);
  } catch (error) {
    console.error("GET Rewards Error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/rewards
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, icon, starCost, monthlyStock, minAge, maxAge, assignedChildIds } = body;

    const newReward = await prisma.reward.create({
      data: {
        title,
        icon: icon || "🎁",
        starCost: parseInt(starCost) || 5,
        monthlyStock: parseInt(monthlyStock) || 1,
        currentStock: parseInt(monthlyStock) || 1,
        minAge: parseInt(minAge) || 2,
        maxAge: parseInt(maxAge) || 18,
        assignments: {
          create: assignedChildIds?.map((childId: string) => ({ childId })) || [],
        },
      },
      include: { assignments: true },
    });

    return NextResponse.json(newReward, { status: 201 });
  } catch (error: any) {
    console.error("POST Reward Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create reward" }, { status: 500 });
  }
}