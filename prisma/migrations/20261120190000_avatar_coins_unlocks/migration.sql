ALTER TABLE "Child" ADD COLUMN "avatarCoins" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AvatarUnlock" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "theme" TEXT NOT NULL,
  "component" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "cost" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvatarUnlock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AvatarUnlock_childId_theme_component_variant_key" ON "AvatarUnlock"("childId", "theme", "component", "variant");
ALTER TABLE "AvatarUnlock" ADD CONSTRAINT "AvatarUnlock_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
