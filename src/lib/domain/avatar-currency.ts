import type { Prisma } from "@prisma/client";

// Call only inside the transaction that owns the underlying event.
// Event source keys are unique per child; this preserves an auditable net balance.
export async function creditAvatarCoins(tx: Prisma.TransactionClient, childId: string, sourceKey: string, amount: number, reason: string) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError("Invalid credit");
  const child = await tx.child.findUniqueOrThrow({ where: { id: childId }, select: { avatarCoinDebt: true } });
  const debtPaid = Math.min(child.avatarCoinDebt, amount);
  const spendable = amount - debtPaid;
  await tx.avatarCurrencyLedger.create({ data: { childId, sourceKey, delta: spendable, debtDelta: -debtPaid, reason } });
  await tx.child.update({
    where: { id: childId },
    data: { avatarCoins: { increment: spendable }, avatarCoinDebt: { decrement: debtPaid } },
  });
  return spendable;
}

export async function clawBackAvatarCoins(tx: Prisma.TransactionClient, childId: string, sourceKey: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError("Invalid clawback");
  const child = await tx.child.findUniqueOrThrow({ where: { id: childId }, select: { avatarCoins: true } });
  const debited = Math.min(child.avatarCoins, amount);
  const debtCreated = amount - debited;
  await tx.avatarCurrencyLedger.create({
    data: { childId, sourceKey, delta: -debited, debtDelta: debtCreated, reason: "XP_REVERSAL" },
  });
  await tx.child.update({
    where: { id: childId },
    data: { avatarCoins: { decrement: debited }, avatarCoinDebt: { increment: debtCreated } },
  });
  return { debited, debtCreated };
}

export async function grantedLevelCoins(tx: Prisma.TransactionClient, childId: string, level: number) {
  const entry = await tx.avatarCurrencyLedger.findUnique({
    where: { childId_sourceKey: { childId, sourceKey: `level:${level}:v1` } },
  });
  // Level payouts can be partly assigned to debt instead of spendable currency.
  return entry ? entry.delta - entry.debtDelta : 0;
}
