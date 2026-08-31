import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/assignments?childId=XYZ -> Fetch all scheduled tasks for a child
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");

    const assignments = await prisma.taskAssignment.findMany({
      where: {
        ...(childId && { childId }),
      },
      include: { task: true },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

// POST /api/assignments -> Assign or Toggle a task to a specific day of the week
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, taskId, dayOfWeek } = body;

    if (childId === undefined || !taskId || dayOfWeek === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if task is already assigned to this day
    const existing = await prisma.taskAssignment.findFirst({
      where: { childId, taskId, dayOfWeek: Number(dayOfWeek) },
    });

    if (existing) {
      // Toggle off: Remove assignment
      await prisma.taskAssignment.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", id: existing.id });
    }

    // Assign task to day
    const assignment = await prisma.taskAssignment.create({
      data: {
        childId,
        taskId,
        dayOfWeek: Number(dayOfWeek),
      },
      include: { task: true },
    });

    return NextResponse.json({ action: "added", assignment }, { status: 201 });
  } catch (error) {
    console.error("Assignment POST error:", error);
    return NextResponse.json({ error: "Failed to save assignment" }, { status: 500 });
  }
}