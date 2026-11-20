import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { avatarAppearance, validateAvatarUnlocks } from "@/lib/domain/avatar-appearance";
import { apiError, parseJson } from "@/lib/api";
import { calculateAgeProfile } from "@/lib/ageRules";
import { verifyParentToken } from "@/lib/auth";
import { cookies } from "next/headers";

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
    const child = await prisma.child.findUnique({ where: { id }, select: { id: true, name: true, dob: true, avatarTheme: true, avatarConfig: true } });
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

    const isSwitchingTheme = child.avatarTheme !== theme;
    const isUnderEight = calculateAgeProfile(child.dob).ageYears < 8;
    if (isSwitchingTheme && isUnderEight) {
      const token = (await cookies()).get("parent_session")?.value;
      let parentVerified = false;
      if (token) {
        try {
          const verified = await verifyParentToken(token);
          parentVerified = verified.payload.role === "parent";
        } catch {
          parentVerified = false;
        }
      }
      if (!parentVerified) {
        return NextResponse.json({ error: "A parent must verify their PIN before changing this child's avatar theme." }, { status: 403 });
      }
    }

    if (!await validateAvatarUnlocks(id, { theme, config })) {
      return NextResponse.json({ error: "Complete more chores to unlock that part." }, { status: 400 });
    }

    // Updating the avatar and recording its audit trail must succeed or fail together.
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.child.update({
        where: { id },
        data: { avatarTheme: theme, avatarConfig: JSON.stringify(theme === "bottts" ? config : {}) },
        select: { id: true, avatarTheme: true, avatarConfig: true },
      });
      await tx.auditLog.create({
        data: {
          actor: child.name,
          actorType: isSwitchingTheme && isUnderEight ? "PARENT" : "CHILD",
          action: "UPDATED_AVATAR",
          details: `${child.name} updated their avatar (${child.avatarTheme ?? "none"} -> ${theme})`,
        },
      });
      return result;
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Failed to save avatar config:", error);
    return apiError(error, "Failed to save avatar");
  }
}