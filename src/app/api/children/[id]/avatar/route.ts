import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const body = await req.json();
    const { theme, config } = body;

    const updated = await prisma.child.update({
      where: { id },
      data: {
        avatarTheme: theme,
        avatarConfig: JSON.stringify(config),
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
    return NextResponse.json({ error: "Failed to save avatar" }, { status: 500 });
  }
}