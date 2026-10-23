import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitCompletion, approveCompletion, declineCompletion } from "@/lib/domain/completions";
import { getTodayDate } from "@/lib/domain/dates";

// GET /api/completions?childId=XYZ&status=PENDING&date=today
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const status = searchParams.get("status");
    const dateParam = searchParams.get("date");

    const forDate = dateParam === "today" ? getTodayDate() : undefined;

    const completions = await prisma.completion.findMany({
      where: {
        ...(childId && { childId }),
        ...(status && { status }),
        ...(forDate && { forDate }),
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

// POST /api/completions -> Submit daily chore completion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId, taskId } = body;

    if (!childId || !taskId) {
      return NextResponse.json({ error: "childId and taskId are required" }, { status: 400 });
    }

    const completion = await submitCompletion(childId, taskId);
    return NextResponse.json(completion, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to submit completion";
    if (message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to submit completion" }, { status: 500 });
  }
}

// PATCH /api/completions -> Handle Parent Approval or Decline
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { completionId, action } = body;

    if (!completionId || !action) {
      return NextResponse.json({ error: "completionId and action are required" }, { status: 400 });
    }

    if (action === "APPROVE") {
      const res = await approveCompletion(completionId);
      return NextResponse.json(res);
    }

    if (action === "DECLINE") {
      const res = await declineCompletion(completionId);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process completion";
    if (message.startsWith("NOT_FOUND")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.startsWith("INVALID_STATE") || message.startsWith("CONCURRENCY_ERROR")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process completion" }, { status: 500 });
  }
}