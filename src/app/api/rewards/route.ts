import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rewards = await prisma.reward.findMany({
      orderBy: { starCost: "asc" },
    });
    return NextResponse.json(rewards);
  } catch (error) {
    return NextResponse.json([], { status: 200 }); // Return empty array safely
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, icon, starCost, monthlyStock } = body;

    const newReward = await prisma.reward.create({
      data: {
        title,
        icon: icon || "🎁",
        starCost: parseInt(starCost) || 5,
        monthlyStock: parseInt(monthlyStock) || 1,
        currentStock: parseInt(monthlyStock) || 1,
      },
    });

    return NextResponse.json(newReward, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create reward" }, { status: 500 });
  }
}