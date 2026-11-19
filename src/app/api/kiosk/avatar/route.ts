import { NextResponse } from "next/server";
import { z } from "zod";
import { avatarAppearance, validateAvatarUnlocks } from "@/lib/domain/avatar-appearance";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";

const appearance = avatarAppearance.extend({ childId: z.uuid() });

export async function POST(request: Request) {
  try {
    const { childId, theme, config } = await parseJson(request, appearance);
    if (!await validateAvatarUnlocks(childId, { theme, config })) {
      return NextResponse.json({ error: "Complete more chores to unlock that part." }, { status: 400 });
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
