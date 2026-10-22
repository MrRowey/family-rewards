import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/completions?childId=XYZ or ?status=PENDING
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const status = searchParams.get("status");

    const completions = await prisma.completion.findMany({
      where: {
        ...(childId && { childId }),
        ...(status && { status }),
      },
      include: {
        task: true,
        child: true,
      },
      orderBy: { completedAt: "asc" },
    });

    return NextResponse.json(completions);
  } catch {
    return NextResponse.json({ error: "Failed to fetch completions" }, { status: 500 });
  }
}

// POST /api/completions -> Submit chore completion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, taskId } = body;

    if (!childId || !taskId) {
      return NextResponse.json({ error: "Child ID and Task ID required" }, { status: 400 });
    }

    const existing = await prisma.completion.findFirst({
      where: { childId, taskId },
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "APPROVED") {
        return NextResponse.json(existing);
      }

      const updated = await prisma.completion.update({
        where: { id: existing.id },
        data: { status: "PENDING", completedAt: new Date() },
      });

      return NextResponse.json(updated);
    }

    const completion = await prisma.completion.create({
      data: { childId, taskId, status: "PENDING" },
    });

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    console.error("Completion POST error:", error);
    return NextResponse.json({ error: "Failed to submit completion" }, { status: 500 });
  }
}

// PATCH /api/completions -> Handle Parent Approval or Decline
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { completionId, action } = body;

    if (!completionId || !action) {
      return NextResponse.json({ error: "Completion ID and Action required" }, { status: 400 });
    }

    const completion = await prisma.completion.findUnique({
      where: { id: completionId },
      include: { task: true, child: true },
    });

    if (!completion) {
      return NextResponse.json({ error: "Completion record not found" }, { status: 404 });
    }

    if (action === "DECLINE") {
      // Return chore back to queue by deleting completion
      await prisma.completion.delete({ where: { id: completionId } });

      await prisma.auditLog.create({
        data: {
          actor: "Parent",
          actorType: "PARENT",
          action: "DECLINED_TASK",
          details: `Declined "${completion.task.title}" for ${completion.child.name}. Returned to queue.`,
        },
      });

      return NextResponse.json({ success: true, message: "Task returned to queue" });
    }

    if (action === "APPROVE") {
      // Award stars and mark completion APPROVED
      await prisma.$transaction([
        prisma.completion.update({
          where: { id: completionId },
          data: { status: "APPROVED" },
        }),
        prisma.child.update({
          where: { id: completion.childId },
          data: { stars: { increment: completion.task.starValue } },
        }),
        prisma.auditLog.create({
          data: {
            actor: "Parent",
            actorType: "PARENT",
            action: "APPROVED_TASK",
            details: `Approved "${completion.task.title}" for ${completion.child.name} (+${completion.task.starValue} stars).`,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: "Stars awarded successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Completion PATCH error:", error);
    return NextResponse.json({ error: "Failed to process completion action" }, { status: 500 });
  }
}