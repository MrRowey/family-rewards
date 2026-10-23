import { prisma } from "@/lib/prisma";
import { getTodayDate } from "./dates";

export async function submitCompletion(childId: string, taskId: string, forDateInput?: Date) {
  const forDate = forDateInput || getTodayDate();

  return await prisma.$transaction(async (tx) => {
    const child = await tx.child.findUnique({ where: { id: childId } });
    const task = await tx.task.findUnique({ where: { id: taskId } });

    if (!child || !task) {
      throw new Error("NOT_FOUND: Child or Task record not found");
    }

    const existing = await tx.completion.findUnique({
      where: {
        childId_taskId_forDate: {
          childId,
          taskId,
          forDate,
        },
      },
    });

    if (existing) {
      if (existing.status === "PENDING" || existing.status === "APPROVED") {
        return existing;
      }

      // Re-submit declined task for approval
      return await tx.completion.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          completedAt: new Date(),
        },
      });
    }

    const completion = await tx.completion.create({
      data: {
        childId,
        taskId,
        forDate,
        status: "PENDING",
      },
    });

    await tx.auditLog.create({
      data: {
        actor: child.name,
        actorType: "CHILD",
        action: "COMPLETED_TASK",
        details: `Submitted chore "${task.title}" for approval.`,
      },
    });

    return completion;
  });
}

export async function approveCompletion(completionId: string) {
  return await prisma.$transaction(async (tx) => {
    const completion = await tx.completion.findUnique({
      where: { id: completionId },
      include: { task: true, child: true },
    });

    if (!completion) {
      throw new Error("NOT_FOUND: Completion record not found");
    }

    if (completion.status !== "PENDING") {
      throw new Error("INVALID_STATE: Only PENDING completions can be approved");
    }

    const updated = await tx.completion.updateMany({
      where: { id: completionId, status: "PENDING" },
      data: { status: "APPROVED" },
    });

    if (updated.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Completion status already updated");
    }

    await tx.child.update({
      where: { id: completion.childId },
      data: { stars: { increment: completion.task.starValue } },
    });

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "APPROVED_TASK",
        details: `Approved chore "${completion.task.title}" for ${completion.child.name} (+${completion.task.starValue} stars).`,
      },
    });

    return { success: true };
  });
}

export async function declineCompletion(completionId: string) {
  return await prisma.$transaction(async (tx) => {
    const completion = await tx.completion.findUnique({
      where: { id: completionId },
      include: { task: true, child: true },
    });

    if (!completion) {
      throw new Error("NOT_FOUND: Completion record not found");
    }

    if (completion.status !== "PENDING") {
      throw new Error("INVALID_STATE: Only PENDING completions can be declined");
    }

    const updated = await tx.completion.updateMany({
      where: { id: completionId, status: "PENDING" },
      data: { status: "DECLINED" },
    });

    if (updated.count === 0) {
      throw new Error("CONCURRENCY_ERROR: Completion status already updated");
    }

    await tx.auditLog.create({
      data: {
        actor: "Parent",
        actorType: "PARENT",
        action: "DECLINED_TASK",
        details: `Declined chore "${completion.task.title}" for ${completion.child.name}.`,
      },
    });

    return { success: true };
  });
}