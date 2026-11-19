import { beforeEach, describe, expect, it, vi } from "vitest";

const { transaction, findFirst, createConfig, updateConfig, createAudit } = vi.hoisted(() => ({
  transaction: vi.fn(), findFirst: vi.fn(), createConfig: vi.fn(), updateConfig: vi.fn(), createAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { familyConfig: { findFirst }, $transaction: transaction },
}));

import { getKioskSettings, KioskSettingsSchema, updateKioskSettings } from "@/features/kiosk/settings";

beforeEach(() => {
  vi.clearAllMocks();
  transaction.mockImplementation((callback) => callback({
    familyConfig: { findFirst, create: createConfig, update: updateConfig },
    auditLog: { create: createAudit },
  }));
});

describe("kiosk settings service", () => {
  it("returns defaults before setup", async () => {
    findFirst.mockResolvedValue(null);
    await expect(getKioskSettings()).resolves.toEqual({
      idleTimeoutSec: 45, soundEffects: true, maxDailyTasks: 5,
      reducedMotion: false, largeKioskText: false, showPickerStars: true,
    });
  });

  it("rejects malformed and out-of-range settings", () => {
    expect(KioskSettingsSchema.safeParse({ soundEffects: "false" }).success).toBe(false);
    expect(KioskSettingsSchema.safeParse({ idleTimeoutSec: -1 }).success).toBe(false);
    expect(KioskSettingsSchema.safeParse({ maxDailyTasks: 0 }).success).toBe(false);
    expect(KioskSettingsSchema.safeParse({ soundEffects: false, maxDailyTasks: 4 }).success).toBe(true);
  });

  it("returns saved display preferences", async () => {
    findFirst.mockResolvedValue({ reducedMotion: true, largeKioskText: true, showPickerStars: false });
    await expect(getKioskSettings()).resolves.toMatchObject({ reducedMotion: true, largeKioskText: true, showPickerStars: false });
  });

  it("preserves legacy endpoint behavior when configuration is missing", async () => {
    findFirst.mockResolvedValue(null);
    await expect(updateKioskSettings({ soundEffects: false }, false)).rejects.toThrow("CONFIG_NOT_INITIALIZED");
    expect(createConfig).not.toHaveBeenCalled();
  });

  it("initializes missing settings for the canonical endpoint", async () => {
    findFirst.mockResolvedValue(null);
    createConfig.mockResolvedValue({ id: "cfg1" });
    updateConfig.mockResolvedValue({ idleTimeoutSec: 60, soundEffects: false, maxDailyTasks: 5 });
    await expect(updateKioskSettings({ idleTimeoutSec: 60, soundEffects: false }, true)).resolves.toEqual({
      idleTimeoutSec: 60, soundEffects: false, maxDailyTasks: 5,
      reducedMotion: false, largeKioskText: false, showPickerStars: true,
    });
    expect(createConfig).toHaveBeenCalledTimes(1);
    expect(createAudit).toHaveBeenCalledTimes(1);
  });
});
