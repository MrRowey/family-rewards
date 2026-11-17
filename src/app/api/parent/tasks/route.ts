import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { CreateTaskSchema } from "@/lib/validation/schemas";
import { createTask, listTasks } from "@/features/tasks/service";

export async function GET() {
  try { return NextResponse.json(await listTasks()); }
  catch { return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const task = await createTask(CreateTaskSchema.parse(await request.json()));
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
