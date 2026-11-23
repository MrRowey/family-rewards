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
  "avatarCoinDebt", "starDebt", "xpLedger", "currencyLedger", "avatarMilestones",
]) {
  const pattern = new RegExp(`^\\s+${field}\\s+[^\\n]+\\n`, "gm");
  schema = schema.replace(pattern, "");
}
for (const model of ["XpLedger", "AvatarCurrencyLedger", "AvatarMilestone"]) {
  const pattern = new RegExp(`\\nmodel ${model} \\{[\\s\\S]*?\\n\\}\\n`, "gm");
  schema = schema.replace(pattern, "\n");
}
writeFileSync(path, schema);
