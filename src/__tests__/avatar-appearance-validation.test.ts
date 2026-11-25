import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { avatarAppearance } from "@/lib/domain/avatar-appearance";
import { avatarOptions } from "@/lib/avatar-catalog";

describe("theme-specific avatar configuration", () => {
  it("accepts the catalog defaults for each supported theme", () => {
    for (const theme of ["sprouts", "bottts", "botttsNeutral", "critters", "voxelBot", "constellation", "planets", "adventurer", "funEmoji"]) {
      const options = Object.fromEntries(Object.entries(avatarOptions(theme)).filter(([key, spec]) => key.endsWith("Variant") && spec.type === "enum" && spec.values?.length).map(([key, spec]) => [key, [spec.values![0]]]));
      expect(avatarAppearance.safeParse({ theme, config: { options } }).success).toBe(true);
    }
  });
  it("rejects unknown options, invalid variants and malformed colors", () => {
    for (const options of [{ inventedOption: true }, { eyesVariant: ["invented"] }, { backgroundColor: ["not-a-color"] }, { backgroundColor: true }]) {
      expect(avatarAppearance.safeParse({ theme: "bottts", config: { options } }).success).toBe(false);
    }
  });
  it("retains legacy avatar configuration support", () => {
    expect(avatarAppearance.safeParse({ theme: "bottts", config: { baseColor: ["abcdef"], top: ["antenna"], eyes: ["round"] } }).success).toBe(true);
  });
});
