import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const KioskSettingsSchema = z.object({
  idleTimeoutSec: z.number().int().min(10).max(3600).optional(),
  soundEffects: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  largeKioskText: z.boolean().optional(),
  showPickerStars: z.boolean().optional(),
  maxDailyTasks: z.number().int().min(1).max(100).optional(),
}).strict();

export async function getKioskSettings() {
  const config = await prisma.familyConfig.findFirst();
  return {
    idleTimeoutSec: config?.idleTimeoutSec ?? 45,
    soundEffects: config?.soundEffects ?? true,
    reducedMotion: config?.reducedMotion ?? false,
    largeKioskText: config?.largeKioskText ?? false,
    showPickerStars: config?.showPickerStars ?? true,
    maxDailyTasks: config?.maxDailyTasks ?? 5,
  };
}

export async function updateKioskSettings(input: z.infer<typeof KioskSettingsSchema>, initializeIfMissing: boolean) {
  return prisma.$transaction(async (tx) => {
    let config = await tx.familyConfig.findFirst();
    if (!config) {
      if (!initializeIfMissing) throw new Error("CONFIG_NOT_INITIALIZED");
      config = await tx.familyConfig.create({
        data: { isConfigured: false, idleTimeoutSec: 45, soundEffects: true, maxDailyTasks: 5 },
      });
    }
    const updated = await tx.familyConfig.update({
      where: { id: config.id },
      data: input,
    });
    await tx.auditLog.create({
      data: {
        actor: "Parent", actorType: "PARENT", action: "UPDATED_KIOSK_CONFIG",
        details: `Updated kiosk settings (timeout: ${updated.idleTimeoutSec}s, sfx: ${updated.soundEffects})`,
      },
    });
    return {
      idleTimeoutSec: updated.idleTimeoutSec,
      soundEffects: updated.soundEffects,
      reducedMotion: updated.reducedMotion ?? false,
      largeKioskText: updated.largeKioskText ?? false,
      showPickerStars: updated.showPickerStars ?? true,
      maxDailyTasks: updated.maxDailyTasks,
    };
  });
}
