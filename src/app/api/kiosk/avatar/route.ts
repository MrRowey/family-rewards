import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";

const appearance = z.object({
  childId: z.uuid(),
  theme: z.enum(["bottts", "adventurer", "funEmoji"]),
  config: z.object({
    baseColor: z.tuple([z.string().regex(/^[a-f0-9]{6}$/)]).optional(),
    top: z.tuple([z.enum(["antenna", "horns", "bulb01", "radar", "crown"])]).optional(),
    eyes: z.tuple([z.enum(["round", "square", "eva", "sparkle"])]).optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const { childId, theme, config } = await parseJson(request, appearance);
    const minimumTop = { antenna: 0, horns: 0, bulb01: 3, radar: 8, crown: 15 };
    const minimumEyes = { round: 0, square: 0, eva: 5, sparkle: 10 };
    if (theme === "bottts") {
      const minimum = Math.max(minimumTop[config.top?.[0] ?? "antenna"], minimumEyes[config.eyes?.[0] ?? "round"]);
      if (minimum && await prisma.completion.count({ where: { childId, status: "APPROVED" } }) < minimum) {
        return NextResponse.json({ error: "Complete more chores to unlock that part." }, { status: 400 });
      }
    }
    const result = await prisma.child.updateMany({
      where: { id: childId, avatarConfig: null },
      data: { avatarTheme: theme, avatarConfig: JSON.stringify(theme === "bottts" ? config : {}) },
    });
    if (result.count !== 1) {
      return NextResponse.json({ error: "This profile already has an avatar or is unavailable." }, { status: 409 });
    }
    const child = await prisma.child.findUnique({ where: { id: childId }, select: { name: true } });
    await prisma.auditLog.create({ data: { actor: child?.name ?? "Parent", actorType: "PARENT", action: "CREATED_AVATAR", details: `Created first avatar for ${child?.name ?? childId} (${theme})` } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Could not save the avatar.");
  }
}
