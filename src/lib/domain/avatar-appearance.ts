import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const avatarAppearance = z.object({
  theme: z.enum(["bottts", "adventurer", "funEmoji"]),
  config: z.object({
    baseColor: z.tuple([z.string().regex(/^[a-f0-9]{6}$/)]).optional(),
    top: z.tuple([z.enum(["antenna", "horns", "bulb01", "radar", "crown"])]).optional(),
    eyes: z.tuple([z.enum(["round", "square", "eva", "sparkle"])]).optional(),
  }).strict(),
}).strict();

const topUnlocks: Record<string, number> = { antenna: 0, horns: 0, bulb01: 3, radar: 8, crown: 15 };
const eyeUnlocks: Record<string, number> = { round: 0, square: 0, eva: 5, sparkle: 10 };

export async function validateAvatarUnlocks(childId: string, appearance: z.output<typeof avatarAppearance>): Promise<boolean> {
  if (appearance.theme !== "bottts") return true;
  const required = Math.max(topUnlocks[appearance.config.top?.[0] ?? "antenna"], eyeUnlocks[appearance.config.eyes?.[0] ?? "round"]);
  if (required === 0) return true;
  const completed = await prisma.completion.count({ where: { childId, status: "APPROVED" } });
  return completed >= required;
}
