CREATE TABLE "XpLedger" ("id" TEXT NOT NULL, "childId" TEXT NOT NULL, "sourceKey" TEXT NOT NULL, "delta" INTEGER NOT NULL, "stars" INTEGER NOT NULL, "minFactor" INTEGER NOT NULL, "maxFactor" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "XpLedger_sourceKey_key" ON "XpLedger"("sourceKey");
CREATE INDEX "XpLedger_childId_createdAt_idx" ON "XpLedger"("childId","createdAt");
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AvatarCurrencyLedger" ("id" TEXT NOT NULL, "childId" TEXT NOT NULL, "sourceKey" TEXT NOT NULL, "delta" INTEGER NOT NULL, "reason" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AvatarCurrencyLedger_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AvatarCurrencyLedger_sourceKey_key" ON "AvatarCurrencyLedger"("sourceKey");
CREATE INDEX "AvatarCurrencyLedger_childId_createdAt_idx" ON "AvatarCurrencyLedger"("childId","createdAt");
ALTER TABLE "AvatarCurrencyLedger" ADD CONSTRAINT "AvatarCurrencyLedger_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
