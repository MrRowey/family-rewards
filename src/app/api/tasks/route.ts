import { NextResponse } from "next/server";
import { apiError, parseJson } from "@/lib/api";
import { CreateTaskSchema, UpdateTaskSchema } from "@/lib/validation/schemas";
import { createTask, listTasks, updateTask } from "@/features/tasks/service";

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

export async function PATCH(request: Request) {
  try { return NextResponse.json(await updateTask(await parseJson(request, UpdateTaskSchema))); }
  catch (error) { return apiError(error, "Failed to update chore"); }
}
