import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { backupSchema } from "@/features/admin/backupSchema";

const restoreSchema = z.object({
  backup: backupSchema,
  confirmation: z.literal("REPLACE FAMILY DATA").optional(),
});
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ error: "Send a JSON backup." }, { status: 415 });
  }
  if (Number(request.headers.get("content-length")) > maxBytes) {
    return NextResponse.json({ error: "Backup exceeds the 10 MB limit." }, { status: 413 });
  }

  let input: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > maxBytes) {
      return NextResponse.json({ error: "Backup exceeds the 10 MB limit." }, { status: 413 });
    }
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Choose a valid JSON backup." }, { status: 400 });
  }

  const parsed = restoreSchema.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join(".");
    return NextResponse.json({ error: path ? "Invalid backup data at " + path : "Invalid backup." }, { status: 400 });
  }

  const { data, version } = parsed.data.backup;
  const summary = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length]));
  if (!parsed.data.confirmation) return NextResponse.json({ version, summary });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.child.deleteMany();
      await tx.task.deleteMany();
      await tx.reward.deleteMany();
      if (version === "2.0") await tx.badge.deleteMany();
      await tx.auditLog.deleteMany();

      await tx.child.createMany({ data: data.children });
      await tx.task.createMany({ data: data.tasks });
      await tx.reward.createMany({ data: data.rewards });
      await tx.badge.createMany({ data: data.badges });
      await tx.subStep.createMany({ data: data.subSteps });
      await tx.taskAssignment.createMany({ data: data.assignments });
      await tx.completion.createMany({ data: data.completions });
      await tx.rewardRedemption.createMany({ data: data.redemptions });
      await tx.rewardAssignment.createMany({ data: data.rewardAssignments });
      await tx.shopPlan.createMany({ data: data.shopPlans });
      await tx.groupRewardPledge.createMany({ data: data.groupPledges });
      await tx.childBadge.createMany({ data: data.childBadges });
      await tx.auditLog.createMany({ data: data.logs });
      await tx.auditLog.create({ data: {
        actor: "Parent", actorType: "PARENT", action: "RESTORED_BACKUP",
        details: "Restored family data from a version " + version + " backup.",
      } });
    }, { isolationLevel: "Serializable", timeout: 60000 });
    return NextResponse.json({ version, summary });
  } catch (error) {
    console.error("Backup restore failed:", error);
    return NextResponse.json({ error: "Restore failed. Existing family data was kept. Check for invalid or duplicate records." }, { status: 409 });
  }
}
