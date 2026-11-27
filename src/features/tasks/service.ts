import { prisma } from "@/lib/prisma";
import { CreateTaskSchema, UpdateTaskSchema } from "@/lib/validation/schemas";
import type { z } from "zod";

export async function listTasks(order: "created" | "age" = "created") {
  return prisma.task.findMany({
    include: { subSteps: { orderBy: { order: "asc" } } },
    orderBy: order === "created" ? { createdAt: "desc" } : { minAge: "asc" },
  });
}

export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: input.title,
        category: input.category || null,
        icon: input.icon,
        imageURL: input.imageUrl || null,
        starValue: input.starValue,
        minAge: input.minAge,
        maxAge: input.maxAge,
        subSteps: input.subSteps?.length
          ? { create: input.subSteps.map((title, idx) => ({ title, order: idx })) }
          : undefined,
      },
      include: { subSteps: true },
    });
    await tx.auditLog.create({
      data: {
        actor: "Parent", actorType: "PARENT", action: "CREATED_TASK",
        details: `Created task "${task.title}" (+${task.starValue} stars).`,
      },
    });
    return task;
  });
}

export async function updateTask(input: z.infer<typeof UpdateTaskSchema>) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error("NOT_FOUND: Chore not found");
    if (existing.starValue !== input.starValue && await tx.completion.count({ where: { taskId: input.id, status: "PENDING" } })) {
      throw new Error("INVALID_STATE: Resolve pending approvals before changing the star value.");
    }
    const task = await tx.task.update({
      where: { id: input.id },
      data: { title: input.title, category: input.category || null, icon: input.icon, starValue: input.starValue,
        subSteps: { deleteMany: {}, create: input.subSteps.map((title, order) => ({ title, order })) } },
      include: { subSteps: { orderBy: { order: "asc" } } },
    });
    await tx.auditLog.create({ data: { actor: "Parent", actorType: "PARENT", action: "UPDATED_TASK", details: `Updated chore "${existing.title}" to "${task.title}" (${existing.starValue} to ${task.starValue} stars).` } });
    return task;
  }, { isolationLevel: "Serializable" });
}
