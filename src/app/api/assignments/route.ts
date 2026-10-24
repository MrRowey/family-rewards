import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const childId = searchParams.get("childId");

    const assignments = await prisma.taskAssignment.findMany({
      where: childId ? { childId } : undefined,
      include: {
        task: {
          include: {
            subSteps: {
              orderBy: { order: "asc" },
            },
          },
        },
        child: true,
      },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { childId, taskId, dayOfWeek, repeatInterval, startDate, endDate } = body;

    if (!childId || !taskId || dayOfWeek === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const assignment = await prisma.taskAssignment.create({
      data: {
        childId,
        taskId,
        dayOfWeek: Number(dayOfWeek),
        repeatInterval: repeatInterval ? Number(repeatInterval) : 1,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        task: true,
        child: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "SCHEDULED_TASK",
        details: `Assigned task "${assignment.task.title}" to ${assignment.child.name} on day ${dayOfWeek} (every ${repeatInterval || 1} wk)`,
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("Failed to create assignment:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing assignment ID" }, { status: 400 });
    }

    const deleted = await prisma.taskAssignment.delete({
      where: { id },
      include: { task: true, child: true },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "UNSCHEDULED_TASK",
        details: `Removed assignment for "${deleted.task.title}" from ${deleted.child.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}