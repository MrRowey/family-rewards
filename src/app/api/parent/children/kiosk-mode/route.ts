import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiError, parseJson } from "@/lib/api";

const schema = z.object({
  childId: z.uuid(),
  kioskMode: z.enum(["AUTO", "JUNIOR", "EXPLORER", "TEEN"]),
}).strict();

export async function PATCH(req: Request) {
  try {
    const { childId, kioskMode } = await parseJson(req, schema);
    const updated = await prisma.child.updateMany({
      where: { id: childId },
      data: { kioskMode },
    });
    if (!updated.count) return NextResponse.json({ error: "Child not found" }, { status: 404 });
    await prisma.auditLog.create({
      data: { actor: "Parent", actorType: "PARENT", action: "UPDATED_KIOSK_MODE", details: `Set kiosk mode for child ${childId} to ${kioskMode}` },
    });
    return NextResponse.json({ success: true, kioskMode });
  } catch (error) {
    return apiError(error, "Could not update kiosk mode.");
  }
}
