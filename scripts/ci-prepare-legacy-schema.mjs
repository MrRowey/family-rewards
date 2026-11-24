/**
 * CI-only: model the schema of an earlier Family Rewards db-push installation.
 * Run against a disposable PostgreSQL test database only.
 * The workflow restores the current schema before migration deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";
const path = "prisma/schema.prisma";
let schema = readFileSync(path, "utf8");
for (const field of [
  "xpMinMultiplier", "xpMaxMultiplier", "coinsPerLevel", "milestoneBonusCoins",
  "avatarPurchases", "avatarCoinDebt", "starDebt", "xpLedger", "currencyLedger", "avatarMilestones",
  "celebrationSeenAt", "parentPinFailures", "parentPinLockedUntil",
]) {
  const pattern = new RegExp(`^\\s+${field}\\s+[^\\n]+\\n`, "gm");
  schema = schema.replace(pattern, "");
}
for (const model of ["XpLedger", "AvatarCurrencyLedger", "AvatarMilestone", "AvatarPurchase"]) {
  const pattern = new RegExp(`\\nmodel ${model} \\{[\\s\\S]*?\\n\\}\\n`, "gm");
  schema = schema.replace(pattern, "\n");
}
schema = schema.split("\n").filter(line => !line.includes("@@index([childId, celebrationSeenAt])")).join("\n");
writeFileSync(path, schema);
