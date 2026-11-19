import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { avatarAppearance, validateAvatarUnlocks } from "@/lib/domain/avatar-appearance";
import { apiError, parseJson } from "@/lib/api";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const child = await prisma.child.findUnique({
      where: { id },
      include: {
        badges: {
          include: { badge: true },
        },
      },
    });

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 });
    }

    const completedTasksCount = await prisma.completion.count({
      where: { childId: id, status: "APPROVED" },
    });

    return NextResponse.json({
      hasAvatar: child.avatarConfig !== null,
      theme: child.avatarTheme || "bottts",
      config: child.avatarConfig ? JSON.parse(child.avatarConfig) : {},
      completedTasksCount,
      badges: child.badges.map((b) => b.badge),
    });
  } catch (error) {
    console.error("Failed to load avatar config:", error);
    return NextResponse.json({ error: "Failed to load avatar" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { theme, config } = await parseJson(req, avatarAppearance);
    if (!await validateAvatarUnlocks(id, { theme, config })) {
      return NextResponse.json({ error: "Complete more chores to unlock that part." }, { status: 400 });
    }

    const updated = await prisma.child.update({
      where: { id },
      data: {
        avatarTheme: theme,
        avatarConfig: JSON.stringify(theme === "bottts" ? config : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: updated.name,
        actorType: "CHILD",
        action: "UPDATED_AVATAR",
        details: `${updated.name} updated their avatar in the Dressing Room (${theme})`,
      },
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Failed to save avatar config:", error);
    return apiError(error, "Failed to save avatar");
  }
}