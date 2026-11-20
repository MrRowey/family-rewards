import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const AVATAR_THEMES = ["sprouts", "bottts", "botttsNeutral", "critters", "voxelBot", "constellation", "planets", "adventurer", "funEmoji"] as const;
const hex = z.string().regex(/^[a-fA-F0-9]{6}$/);
export const avatarAppearance = z.object({
  theme: z.enum(AVATAR_THEMES),
  config: z.object({
    flip: z.enum(["none", "horizontal", "vertical", "both"]).optional(),
    // DiceBear options are checked against the selected style's schema at render time.
    options: z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9]*$/), z.union([z.array(z.string().max(100)).max(1), z.boolean()])).optional(),
    // Retain older saved avatars without forcing a new setup.
    baseColor: z.tuple([hex]).optional(),
    top: z.tuple([z.string().max(100)]).optional(),
    eyes: z.tuple([z.string().max(100)]).optional(),
  }).strict(),
}).strict();

export async function validateAvatarUnlocks(childId: string, appearance: z.output<typeof avatarAppearance>): Promise<boolean> {
  if (appearance.theme !== "bottts") return true;
  const topUnlocks: Record<string, number> = { antenna: 0, horns: 0, bulb01: 3, radar: 8, crown: 15 };
  const eyeUnlocks: Record<string, number> = { round: 0, square: 0, eva: 5, sparkle: 10 };
  const required = Math.max(topUnlocks[appearance.config.top?.[0] ?? "antenna"] ?? 0, eyeUnlocks[appearance.config.eyes?.[0] ?? "round"] ?? 0);
  if (!required) return true;
  const completed = await prisma.completion.count({ where: { childId, status: "APPROVED" } });
  return completed >= required;
}
