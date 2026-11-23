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
  if (version === "3.0") {
    const raw = input as { backup?: { data?: Record<string, unknown> } };
    const required = ["avatarUnlocks", "xpLedger", "avatarCurrencyLedger", "avatarMilestones"];
    if (required.some(field => !Array.isArray(raw.backup?.data?.[field]))) {
      return NextResponse.json({ error: "Version 3 backups must include all avatar ledgers and owned cosmetics." }, { status: 400 });
    }
    // Never restore a truncated or tampered financial history as if it were
    // a valid snapshot. Ledger totals must equal each child's saved balances.
    const aggregate = (rows: { childId: string; delta: number; debtDelta?: number }[], field: "delta" | "debtDelta") => {
      const totals = new Map<string, number>();
      for (const entry of rows) totals.set(entry.childId, (totals.get(entry.childId) || 0) + (entry[field] || 0));
      return totals;
    };
    const xp = aggregate(data.xpLedger, "delta");
    const coins = aggregate(data.avatarCurrencyLedger, "delta");
    const debt = aggregate(data.avatarCurrencyLedger, "debtDelta");
    for (const child of data.children) {
      if ((xp.get(child.id) || 0) !== (child.xp || 0) ||
          (coins.get(child.id) || 0) !== (child.avatarCoins || 0) ||
          (debt.get(child.id) || 0) !== (child.avatarCoinDebt || 0)) {
        return NextResponse.json({ error: "Backup XP/Coin ledger totals do not match child balances." }, { status: 400 });
      }
    }
  }
  const summary = Object.fromEntries(Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, (value as unknown[]).length]));
  if (!parsed.data.confirmation) return NextResponse.json({ version, summary });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.child.deleteMany();
      await tx.task.deleteMany();
      await tx.reward.deleteMany();
      if (version !== "1.0") await tx.badge.deleteMany();
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
      await tx.avatarUnlock.createMany({ data: data.avatarUnlocks });
      await tx.avatarMilestone.createMany({ data: data.avatarMilestones });
      if (version === "3.0") {
        await tx.xpLedger.createMany({ data: data.xpLedger });
        await tx.avatarCurrencyLedger.createMany({ data: data.avatarCurrencyLedger });
      } else {
        // Legacy backups did not export event history. Treat their balances as
        // immutable opening snapshots rather than inventing historic XP awards.
        await tx.xpLedger.createMany({ data: data.children.map(child => ({
          childId: child.id, sourceKey: "restore:legacy-opening:v1",
          delta: child.xp ?? 0, stars: 0, minFactor: 0, maxFactor: 0,
        })) });
        await tx.avatarCurrencyLedger.createMany({ data: data.children.map(child => ({
          childId: child.id, sourceKey: "restore:legacy-opening:v1",
          delta: child.avatarCoins ?? 0, debtDelta: child.avatarCoinDebt ?? 0,
          reason: "LEGACY_RESTORE_OPENING_BALANCE",
        })) });
      }
      await tx.auditLog.createMany({ data: data.logs });
      if (data.config) {
        const current = await tx.familyConfig.findFirst({ select: { id: true } });
        if (current) {
          await tx.familyConfig.update({
            where: { id: current.id },
            data: {
              ...(data.config.xpMinMultiplier !== undefined ? { xpMinMultiplier: data.config.xpMinMultiplier } : {}),
              ...(data.config.xpMaxMultiplier !== undefined ? { xpMaxMultiplier: data.config.xpMaxMultiplier } : {}),
              ...(data.config.coinsPerLevel !== undefined ? { coinsPerLevel: data.config.coinsPerLevel } : {}),
              ...(data.config.milestoneBonusCoins !== undefined ? { milestoneBonusCoins: data.config.milestoneBonusCoins } : {}),
            },
          });
        }
      }
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
