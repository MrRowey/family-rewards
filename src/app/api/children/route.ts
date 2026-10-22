import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const children = await prisma.child.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(children);
  } catch {
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, dob, avatar } = body;

    if (!name || !dob) {
      return NextResponse.json({ error: "Name and Date of Birth are required" }, { status: 400 });
    }

    const child = await prisma.child.create({
      data: {
        name,
        dob: new Date(dob),
        avatar: avatar || "👤",
        stars: 0, // Enforce initial stars on backend
      },
    });

    return NextResponse.json(child, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create child" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Child ID is required" }, { status: 400 });
    }

    await prisma.child.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete child" }, { status: 500 });
  }
}