CREATE TABLE "AvatarPurchase" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL,
  "refundedAt" TIMESTAMP(3),
  CONSTRAINT "AvatarPurchase_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AvatarPurchase_childId_purchasedAt_idx" ON "AvatarPurchase"("childId", "purchasedAt");
ALTER TABLE "AvatarPurchase" ADD CONSTRAINT "AvatarPurchase_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "AvatarPurchase" ("id", "childId", "theme", "component", "variant", "cost", "purchasedAt")
SELECT "id", "childId", "theme", "component", "variant", "cost", "createdAt" FROM "AvatarUnlock" WHERE "cost" > 0;
