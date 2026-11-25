import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { avatarAppearance, validateAvatarUnlocks, validateAvatarOwnership } from "@/lib/domain/avatar-appearance";
import { apiError, parseJson } from "@/lib/api";
import { verifyParentToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { isAuthorisedForChild } from "@/lib/kiosk-session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!await isAuthorisedForChild(id)) return NextResponse.json({ error: "Select this child from the Family Hub first." }, { status: 403 });
    const child = await prisma.child.findUnique({ where: { id }, include: { badges: { include: { badge: true } }, avatarUnlocks: true, avatarMilestones: true } });
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
    const completedTasksCount = await prisma.completion.count({ where: { childId: id, status: "APPROVED" } });
    return NextResponse.json({
      hasAvatar: child.avatarConfig !== null,
      canSwitchTheme: false,
      theme: child.avatarTheme || "bottts",
      config: child.avatarConfig ? JSON.parse(child.avatarConfig) : {},
      completedTasksCount,
      avatarCoins: child.avatarCoins,
      unlockedVariants: child.avatarUnlocks.map(item => ({ theme: item.theme, component: item.component, variant: item.variant })),
      unlockedFrames: child.avatarMilestones.map(item => item.cosmeticKey),
      badges: child.badges.map((b) => b.badge),
    });
  } catch (error) {
    console.error("Failed to load avatar:", error);
    return NextResponse.json({ error: "Failed to load avatar" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!await isAuthorisedForChild(id)) return NextResponse.json({ error: "Select this child from the Family Hub first." }, { status: 403 });
    const { theme, config } = await parseJson(req, avatarAppearance);
    const child = await prisma.child.findUnique({ where: { id }, select: { name: true, dob: true, avatarTheme: true, avatarConfig: true } });
    if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });
    if (child.avatarConfig === null) return NextResponse.json({ error: "Choose your first avatar before customising." }, { status: 409 });
    const switching = child.avatarTheme !== theme;
    const parentRequired = switching;
    if (parentRequired) {
      const token = (await cookies()).get("parent_session")?.value;
      let authorised = false;
      if (token) {
        try { authorised = (await verifyParentToken(token)).payload.role === "parent"; } catch { /* invalid session */ }
      }
      if (!authorised) return NextResponse.json({ error: "Only a parent can change an avatar theme." }, { status: 403 });
    }
    if (!await validateAvatarUnlocks(id, { theme, config })) return NextResponse.json({ error: "Complete more chores to unlock that part." }, { status: 400 });
    // Compare-and-swap prevents a stale kiosk request from undoing a parent theme change.
    // The audit event is committed only when the expected theme still matches.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Child" WHERE id = ${id} FOR UPDATE`;
      if (!await validateAvatarOwnership(id, theme, config, tx)) return "UNOWNED" as const;
      const changed = await tx.child.updateMany({
        where: { id, avatarTheme: child.avatarTheme, avatarConfig: child.avatarConfig },
        data: { avatarTheme: theme, avatarConfig: JSON.stringify(config) },
      });
      if (changed.count !== 1) return null;
      await tx.auditLog.create({ data: { actor: child.name, actorType: parentRequired ? "PARENT" : "CHILD", action: "UPDATED_AVATAR", details: `${child.name} updated avatar (${child.avatarTheme ?? "none"} -> ${theme})` } });
      return { id, avatarTheme: theme, avatarConfig: JSON.stringify(config) };
    });
    if (updated === "UNOWNED") return NextResponse.json({ error: "Unlock this avatar part with Avatar Coins first." }, { status: 403 });
    if (!updated) return NextResponse.json({ error: "Avatar changed while editing. Reload and try again." }, { status: 409 });
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    return apiError(error, "Failed to save avatar");
  }
}
