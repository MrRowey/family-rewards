import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Access is restricted by src/proxy.ts to authenticated parents.
export async function GET() {
  try {
    const children = await prisma.child.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(children);
  } catch {
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}
