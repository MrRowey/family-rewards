import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTaskSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      include: { subSteps: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateTaskSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        title: validated.title,
        icon: validated.icon,
        imageUrl: validated.imageUrl || null,
        starValue: validated.starValue,
        minAge: validated.minAge,
        maxAge: validated.maxAge,
        subSteps: validated.subSteps?.length
          ? {
              create: validated.subSteps.map((title, idx) => ({
                title,
                order: idx,
              })),
            }
          : undefined,
      },
      include: { subSteps: true },
    });

    await prisma.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "CREATED_TASK",
        details: `Created task "${task.title}" (+${task.starValue} stars).`,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "errors" in error) {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}