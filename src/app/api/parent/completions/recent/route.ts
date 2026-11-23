import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyParentToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const token = (await cookies()).get("parent_session")?.value;
  try {
    if (!token || (await verifyParentToken(token)).payload.role !== "parent") {
      return NextResponse.json({ error: "Parent PIN required" }, { status: 401 });
    }
  } catch { return NextResponse.json({ error: "Parent PIN required" }, { status: 401 }); }

  const completions = await prisma.completion.findMany({
    where: { status: "APPROVED" },
    include: { task: { select: { title: true } }, child: { select: { name: true } } },
    orderBy: { completedAt: "desc" }, take: 25,
  });
  const approvals = await prisma.xpLedger.findMany({
    where: { sourceKey: { in: completions.map(item => `completion:${item.id}:approved`) } },
    select: { childId: true, sourceKey: true },
  });
  const eligible = new Set(approvals.map(item => `${item.childId}:${item.sourceKey}`));
  return NextResponse.json(completions.map(item => ({
    id: item.id, taskName: item.task.title, childName: item.child.name,
    starsAwarded: item.starsAwarded,
    canReverse: eligible.has(`${item.childId}:completion:${item.id}:approved`),
  })));
}
