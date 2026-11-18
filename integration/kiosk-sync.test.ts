import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { GET as readAssignments, POST as assignChore } from "@/app/api/task-assignments/route";
import { GET as readRewards } from "@/app/api/rewards/route";
import { PUT as saveShopPlan } from "@/app/api/parent/shop-plans/route";
import { getTodayDate } from "@/lib/domain/dates";
import { claimReward } from "@/lib/domain/redemptions";
import { prisma } from "@/lib/prisma";

const label = "Kiosk sync " + randomUUID();
const childIds: string[] = [];
const taskIds: string[] = [];
const rewardIds: string[] = [];

async function createChild() {
  const child = await prisma.child.create({
    data: { name: label, dob: new Date("2016-01-01"), stars: 20 },
  });
  childIds.push(child.id);
  return child;
}

function json(path: string, method: string, body: unknown) {
  return new Request("http://localhost" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { details: { contains: label } } });
  await prisma.child.deleteMany({ where: { id: { in: childIds } } });
  await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  await prisma.reward.deleteMany({ where: { id: { in: rewardIds } } });
  await prisma.$disconnect();
});

it("shows a parent-scheduled one-off chore only to the selected child on its date", async () => {
  const first = await createChild();
  const second = await createChild();
  const chore = await prisma.task.create({ data: { title: label, starValue: 7 } });
  taskIds.push(chore.id);
  const today = getTodayDate();
  const date = today.toISOString().slice(0, 10);
  const response = await assignChore(json("/api/task-assignments", "POST", {
    childId: first.id, taskId: chore.id, dayOfWeek: today.getUTCDay(),
    repeatInterval: 1, startDate: date, endDate: date,
  }));
  expect(response.ok).toBe(true);

  const firstSchedule = await readAssignments(new Request("http://localhost/api/task-assignments?day=today&childId=" + first.id));
  const secondSchedule = await readAssignments(new Request("http://localhost/api/task-assignments?day=today&childId=" + second.id));
  expect(await firstSchedule.json()).toMatchObject([{ task: { id: chore.id, starValue: 7 } }]);
  expect(await secondSchedule.json()).toEqual([]);
});

it("enforces the same monthly plan in the child shop list and when claiming", async () => {
  const first = await createChild();
  const second = await createChild();
  const prize = await prisma.reward.create({
    data: { title: label, starCost: 5, isVisible: false, minAge: 0, maxAge: 120 },
  });
  rewardIds.push(prize.id);
  const now = new Date();
  const response = await saveShopPlan(json("/api/parent/shop-plans", "PUT", {
    childId: first.id, year: now.getFullYear(), month: now.getMonth() + 1, rewardIds: [prize.id],
  }));
  expect(response.ok).toBe(true);

  const firstShop = await readRewards(new Request("http://localhost/api/rewards?childId=" + first.id));
  const secondShop = await readRewards(new Request("http://localhost/api/rewards?childId=" + second.id));
  expect(await firstShop.json()).toMatchObject([{ id: prize.id }]);
  expect(await secondShop.json()).not.toContainEqual(expect.objectContaining({ id: prize.id }));
  await expect(claimReward(second.id, prize.id)).rejects.toThrow("NOT_ELIGIBLE");
  await expect(claimReward(first.id, prize.id)).resolves.toMatchObject({ status: "PENDING" });
});
