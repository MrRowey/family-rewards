import { NextResponse } from "next/server";
import { reverseApprovedCompletion } from "@/lib/domain/completions";
import { cookies } from "next/headers";
import { verifyParentToken } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parent = (await cookies()).get("parent_session")?.value;
  if (!parent) return NextResponse.json({ error: "Parent PIN required" }, { status: 401 });
  try {
    if ((await verifyParentToken(parent)).payload.role !== "parent") {
      return NextResponse.json({ error: "Parent PIN required" }, { status: 403 });
    }
  } catch { return NextResponse.json({ error: "Parent session expired" }, { status: 401 }); }
  const { id } = await params;
  try {
    return NextResponse.json(await reverseApprovedCompletion(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reversal failed";
    const status = message.startsWith("NOT_FOUND") ? 404 : /^(INVALID_STATE|CONCURRENCY_ERROR|LEGACY_APPROVAL)/.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
