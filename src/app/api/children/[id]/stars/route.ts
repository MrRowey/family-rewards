import { NextResponse } from "next/server";
import { POST as adjustStars } from "../../adjust-stars/route";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || ("childId" in body && body.childId !== id)) {
    return NextResponse.json({ error: "Invalid child ID or request body" }, { status: 400 });
  }
  return adjustStars(new Request(request.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, childId: id }),
  }));
}
