ALTER TABLE "FamilyConfig" ADD COLUMN "milestoneBonusCoins" INTEGER NOT NULL DEFAULT 50;
CREATE TABLE "AvatarMilestone" (
  "id" TEXT NOT NULL, "childId" TEXT NOT NULL, "level" INTEGER NOT NULL,
  "policyVersion" INTEGER NOT NULL DEFAULT 1, "bonusCoins" INTEGER NOT NULL,
  "cosmeticKey" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvatarMilestone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AvatarMilestone_childId_level_policyVersion_key" ON "AvatarMilestone"("childId","level","policyVersion");
CREATE UNIQUE INDEX "AvatarMilestone_childId_cosmeticKey_key" ON "AvatarMilestone"("childId","cosmeticKey");
ALTER TABLE "AvatarMilestone" ADD CONSTRAINT "AvatarMilestone_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
