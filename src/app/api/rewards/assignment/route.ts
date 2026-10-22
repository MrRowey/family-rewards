import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rewards/assignment -> Make a reward visible for a child
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rewardId, childId } = body;

    if (!rewardId || !childId) {
      return NextResponse.json(
        { error: "Reward ID and Child ID are required" },
        { status: 400 }
      );
    }

    const assignment = await prisma.rewardAssignment.upsert({
      where: {
        childId_rewardId: {
          childId,
          rewardId,
        },
      },
      update: {},
      create: {
        childId,
        rewardId,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST Reward Assignment Error:", error);
    return NextResponse.json(
      { error: "Failed to assign reward visibility" },
      { status: 500 }
    );
  }
}

// DELETE /api/rewards/assignment -> Hide a reward for a child
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { rewardId, childId } = body;

    if (!rewardId || !childId) {
      return NextResponse.json(
        { error: "Reward ID and Child ID are required" },
        { status: 400 }
      );
    }

    await prisma.rewardAssignment.deleteMany({
      where: {
        rewardId,
        childId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Reward Assignment Error:", error);
    return NextResponse.json(
      { error: "Failed to remove reward visibility" },
      { status: 500 }
    );
  }
}