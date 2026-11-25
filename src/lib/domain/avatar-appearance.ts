import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { avatarOptions, variantExists, variantIsFree } from "@/lib/avatar-catalog";

export const AVATAR_THEMES = ["sprouts", "bottts", "botttsNeutral", "critters", "voxelBot", "constellation", "planets", "adventurer", "funEmoji"] as const;
const hex = z.string().regex(/^[a-fA-F0-9]{6}$/);
export const avatarAppearance = z.object({
  theme: z.enum(AVATAR_THEMES),
  config: z.object({
    flip: z.enum(["none", "horizontal", "vertical", "both"]).optional(),
    frame: z.string().regex(/^level-[1-9][0-9]*-halo$/).max(40).optional(),
    // Validate style-specific options before persisting them.
    options: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), z.union([z.array(z.string().max(100)).max(1), z.boolean()])).optional(),
    // Retain older saved avatars without forcing a new setup.
    baseColor: z.tuple([hex]).optional(),
    top: z.tuple([z.string().max(100)]).optional(),
    eyes: z.tuple([z.string().max(100)]).optional(),
  }).strict(),
}).strict().superRefine(({ theme, config }, ctx) => {
  const descriptors = avatarOptions(theme);
  for (const [key, value] of Object.entries(config.options ?? {})) {
    const spec = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    const valid = spec && (typeof value === "boolean"
      ? spec.type === "boolean"
      : value.length === 1 && ((spec.type === "enum" && spec.values?.includes(value[0])) || (spec.type === "color" && /^[a-fA-F0-9]{6}$/.test(value[0]))));
    if (!valid) ctx.addIssue({ code: "custom", path: ["config", "options", key], message: "Invalid option for this avatar theme." });
  }
});

export async function validateAvatarUnlocks(childId: string, appearance: z.output<typeof avatarAppearance>): Promise<boolean> {
  if (appearance.theme !== "bottts") return true;
  const topUnlocks: Record<string, number> = { antenna: 0, horns: 0, bulb01: 3, radar: 8, crown: 15 };
  const eyeUnlocks: Record<string, number> = { round: 0, square: 0, eva: 5, sparkle: 10 };
  const required = Math.max(topUnlocks[appearance.config.top?.[0] ?? "antenna"] ?? 0, eyeUnlocks[appearance.config.eyes?.[0] ?? "round"] ?? 0);
  if (!required) return true;
  const completed = await prisma.completion.count({ where: { childId, status: "APPROVED" } });
  return completed >= required;
}

export async function validateAvatarOwnership(childId: string, theme: string, config: { options?: Record<string, string[] | boolean>; frame?: string }, db: Prisma.TransactionClient = prisma): Promise<boolean> {
  if (config.frame) {
    const entitlement = await db.avatarMilestone.findFirst({
      where: { childId, cosmeticKey: config.frame },
      select: { id: true },
    });
    if (!entitlement) return false;
  }
  const selected = Object.entries(config.options || {}).filter(([key]) => key.endsWith("Variant"));
  for (const [component, value] of selected) {
    if (!Array.isArray(value) || value.length !== 1 || !variantExists(theme, component, value[0])) return false;
    if (variantIsFree(theme, component, value[0])) continue;
    const owned = await db.avatarUnlock.findUnique({
      where: { childId_theme_component_variant: { childId, theme, component, variant: value[0] } },
    });
    if (!owned) return false;
  }
  return true;
}
