-- Existing badges were earned before this notification system existed.
-- Do not overwhelm existing families with retroactive celebrations on upgrade.
ALTER TABLE "ChildBadge" ADD COLUMN "celebrationSeenAt" TIMESTAMP(3);
UPDATE "ChildBadge" SET "celebrationSeenAt" = CURRENT_TIMESTAMP
WHERE "celebrationSeenAt" IS NULL;
CREATE INDEX "ChildBadge_childId_celebrationSeenAt_idx"
  ON "ChildBadge"("childId", "celebrationSeenAt");
