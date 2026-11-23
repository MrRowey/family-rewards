-- Change initially global ledger keys to per-child idempotency keys.
DROP INDEX IF EXISTS "XpLedger_sourceKey_key";
DROP INDEX IF EXISTS "AvatarCurrencyLedger_sourceKey_key";
CREATE UNIQUE INDEX "XpLedger_childId_sourceKey_key" ON "XpLedger"("childId", "sourceKey");
CREATE UNIQUE INDEX "AvatarCurrencyLedger_childId_sourceKey_key" ON "AvatarCurrencyLedger"("childId", "sourceKey");
ALTER TABLE "Child" ADD COLUMN "avatarCoinDebt" INTEGER NOT NULL DEFAULT 0,
                          ADD COLUMN "starDebt" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FamilyConfig" ADD COLUMN "xpMinMultiplier" INTEGER NOT NULL DEFAULT 5,
                           ADD COLUMN "xpMaxMultiplier" INTEGER NOT NULL DEFAULT 8,
                           ADD COLUMN "coinsPerLevel" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "AvatarCurrencyLedger" ADD COLUMN "debtDelta" INTEGER NOT NULL DEFAULT 0;
-- Existing family balances are opening snapshots, not newly awarded XP or coins.
-- This retains installed users' earned items, levels and purchase history.
INSERT INTO "XpLedger" ("id","childId","sourceKey","delta","stars","minFactor","maxFactor")
SELECT gen_random_uuid()::text, c."id", 'opening:before-ledger:v1',
       c."xp" - COALESCE((SELECT SUM(l."delta") FROM "XpLedger" l WHERE l."childId" = c."id"), 0), 0, 0, 0
FROM "Child" c
ON CONFLICT ("childId","sourceKey") DO NOTHING;
INSERT INTO "AvatarCurrencyLedger" ("id","childId","sourceKey","delta","debtDelta","reason")
SELECT gen_random_uuid()::text, c."id", 'opening:before-ledger:v1',
       c."avatarCoins" - COALESCE((SELECT SUM(l."delta") FROM "AvatarCurrencyLedger" l WHERE l."childId" = c."id"), 0),
       c."avatarCoinDebt" - COALESCE((SELECT SUM(l."debtDelta") FROM "AvatarCurrencyLedger" l WHERE l."childId" = c."id"), 0),
       'OPENING_BALANCE' FROM "Child" c
ON CONFLICT ("childId","sourceKey") DO NOTHING;
