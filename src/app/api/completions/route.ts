import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/completions?childId=XYZ -> Fetch active completions for a child
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    const completions = await prisma.completion.findMany({
      where: {
        ...(childId && { childId }),
      },
      include: { task: true },
    });

    return NextResponse.json(completions);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch completions" }, { status: 500 });
  }
}

// POST /api/completions -> Submit or re-submit a chore for approval
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, taskId } = body;

    if (!childId || !taskId) {
      return NextResponse.json({ error: "Child ID and Task ID are required" }, { status: 400 });
    }

    // Check if a completion record already exists for this child & task
    const existing = await prisma.completion.findFirst({
      where: { childId, taskId },
    });

    if (existing) {
      // If it's already PENDING or APPROVED, leave it alone
      if (existing.status === "PENDING" || existing.status === "APPROVED") {
        return NextResponse.json(existing);
      }

      // IF DECLINED: Reset status back to PENDING for re-approval!
      const updated = await prisma.completion.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          completedAt: new Date(),
        },
      });

      return NextResponse.json(updated);
    }

    // Fresh completion record creation
    const completion = await prisma.completion.create({
      data: {
        childId,
        taskId,
        status: "PENDING",
      },
    });

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    console.error("Completion POST error:", error);
    return NextResponse.json({ error: "Failed to submit completion" }, { status: 500 });
  }
}