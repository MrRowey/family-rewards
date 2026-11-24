ALTER TABLE "FamilyConfig" ADD COLUMN "parentPinFailures" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "parentPinLockedUntil" TIMESTAMP(3);
