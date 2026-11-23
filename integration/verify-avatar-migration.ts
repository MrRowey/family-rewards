import { prisma } from "../src/lib/prisma";

const id = "aabbccdd-0000-4000-8000-000000000025";

async function main() {
  const child = await prisma.child.findUniqueOrThrow({ where: { id } });
  if (child.stars !== 11 || child.avatarCoins !== 17 || child.xp !== 150 || child.rewardedLevel !== 3 ||
      child.avatarCoinDebt !== 0 || child.starDebt !== 0) {
    throw new Error("Legacy balances or entitlements changed during the migration");
  }
  const [xp, currency] = await Promise.all([
    prisma.xpLedger.findUnique({ where: { childId_sourceKey: { childId: id, sourceKey: "opening:before-ledger:v1" } } }),
    prisma.avatarCurrencyLedger.findUnique({ where: { childId_sourceKey: { childId: id, sourceKey: "opening:before-ledger:v1" } } }),
  ]);
  if (xp?.delta !== 150 || currency?.delta !== 17 || currency?.debtDelta !== 0) {
    throw new Error("Legacy opening balances were not recorded correctly in the immutable ledgers");
  }
  const historicBadge = await prisma.childBadge.findUniqueOrThrow({ where: { id: "aabbccdd-0000-4000-8000-000000000027" } });
  if (!historicBadge.celebrationSeenAt) throw new Error("Historic achievement should already be marked celebrated");
  await prisma.child.delete({ where: { id } });
  await prisma.badge.delete({ where: { id: "aabbccdd-0000-4000-8000-000000000026" } });
  process.stdout.write("Legacy Avatar migration verified: XP, Stars, Coins, levels and ledger baselines preserved.\n");
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
