import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { CreateTaskSchema } from "@/lib/validation/schemas";
import { createTask, listTasks } from "@/features/tasks/service";

export async function GET() {
  try { return NextResponse.json(await listTasks()); }
  catch (error) { return apiError(error, "Failed to fetch tasks"); }
}

export async function POST(request: Request) {
  try {
    const task = await createTask(await parseJson(request, CreateTaskSchema));
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return apiError(error, "Failed to create task");
  }
}
