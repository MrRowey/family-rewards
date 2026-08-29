import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const children = await prisma.child.findMany({
      orderBy: { dob: "asc" },
    });
    return NextResponse.json(children);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch children" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, dob, avatar, stars } = body;

    if (!name || !dob) {
      return NextResponse.json({ error: "Name and DOB are required" }, { status: 400 });
    }

    const newChild = await prisma.child.create({
      data: {
        name,
        dob: new Date(dob),
        avatar: avatar || "🦁",
        stars: stars ? Number(stars) : 0,
      },
    });

    return NextResponse.json(newChild, { status: 201 });
  } catch (error) {
    console.error("Child POST Error:", error);
    return NextResponse.json({ error: "Failed to add child" }, { status: 500 });
  }
}