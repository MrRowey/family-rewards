import { NextResponse } from "next/server";
import { z } from "zod";
import { avatarAppearance, validateAvatarUnlocks, validateAvatarOwnership } from "@/lib/domain/avatar-appearance";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";

const appearance = avatarAppearance.extend({ childId: z.uuid() });

export async function POST(request: Request) {
  try {
    const { childId, theme, config } = await parseJson(request, appearance);
    if (!await validateAvatarUnlocks(childId, { theme, config })) {
    if (!await validateAvatarOwnership(childId, theme, config)) return NextResponse.json({ error: "Unlock this avatar part with Avatar Coins first." }, { status: 403 });
      return NextResponse.json({ error: "Complete more chores to unlock that part." }, { status: 400 });
    }
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.child.updateMany({
        where: { id: childId, avatarConfig: null },
        data: { avatarTheme: theme, avatarConfig: JSON.stringify(config) },
      });
      if (updated.count !== 1) return false;
      const child = await tx.child.findUnique({ where: { id: childId }, select: { name: true } });
      await tx.auditLog.create({
        data: {
          actor: child?.name ?? childId,
          actorType: "CHILD",
          action: "CREATED_AVATAR",
          details: `Created first avatar for ${child?.name ?? childId} (${theme})`,
        },
      });
      return true;
    });
    if (!result) {
      return NextResponse.json({ error: "This profile already has an avatar or is unavailable." }, { status: 409 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Could not save the avatar.");
  }
}
