import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { PATCH } from "@/app/api/parent/tasks/route";
import { prisma } from "@/lib/prisma";

const label = "Chore edit " + randomUUID();
const taskIds: string[] = [];
const childIds: string[] = [];
const date = new Date("2026-11-20");

async function fixture(status: "PENDING" | "APPROVED") {
  const child = await prisma.child.create({ data: { name: label, dob: new Date("2016-01-01"), stars: 20 } });
  childIds.push(child.id);
  const task = await prisma.task.create({ data: { title: label, starValue: 5, minAge: 4, maxAge: 15, subSteps: { create: { title: "Old step", order: 0 } } } });
  taskIds.push(task.id);
  const assignment = await prisma.taskAssignment.create({ data: { childId: child.id, taskId: task.id, dayOfWeek: 5, repeatInterval: 2, startDate: date } });
  const completion = await prisma.completion.create({ data: { childId: child.id, taskId: task.id, forDate: date, status, starsAwarded: status === "APPROVED" ? 5 : null } });
  return { child, task, assignment, completion };
}

function edit(id: string, changes: Record<string, unknown> = {}) {
  return PATCH(new Request("http://localhost/api/parent/tasks", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title: label + " edited", category: "Home", icon: "⭐", starValue: 8, subSteps: ["First", "Second"], ...changes }),
  }));
}

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { details: { contains: label } } });
  await prisma.child.deleteMany({ where: { id: { in: childIds } } });
  await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  await prisma.$disconnect();
});

describe("Chore editing integrity", () => {
  it("updates the same chore while preserving assignments and historical awards", async () => {
    const { child, task, assignment, completion } = await fixture("APPROVED");
    const response = await edit(task.id);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: task.id, title: label + " edited", category: "Home", starValue: 8, minAge: 4, maxAge: 15, subSteps: [{ title: "First", order: 0 }, { title: "Second", order: 1 }] });
    expect(await prisma.taskAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).toEqual(assignment);
    expect(await prisma.completion.findUniqueOrThrow({ where: { id: completion.id } })).toEqual(completion);
    expect((await prisma.child.findUniqueOrThrow({ where: { id: child.id } })).stars).toBe(20);
    expect(await prisma.auditLog.count({ where: { action: "UPDATED_TASK", details: { contains: label } } })).toBeGreaterThan(0);
  });

  it("rejects pending star-value changes without modifying the chore or completion", async () => {
    const { task, completion } = await fixture("PENDING");
    expect((await edit(task.id)).status).toBe(409);
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).toEqual(task);
    expect(await prisma.completion.findUniqueOrThrow({ where: { id: completion.id } })).toEqual(completion);
    expect((await edit(task.id, { starValue: 5 })).status).toBe(200);
  });

  it("rejects invalid edits and missing chores", async () => {
    const { task } = await fixture("APPROVED");
    for (const changes of [{ title: " " }, { starValue: 0 }, { starValue: 1.5 }, { subSteps: [" "] }]) {
      expect((await edit(task.id, changes)).status).toBe(400);
    }
    expect((await edit(randomUUID())).status).toBe(404);
    expect(await prisma.task.findUniqueOrThrow({ where: { id: task.id } })).toEqual(task);
  });
});
