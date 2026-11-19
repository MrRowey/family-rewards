import { prisma } from "@/lib/prisma";
import { CreateTaskSchema } from "@/lib/validation/schemas";
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
