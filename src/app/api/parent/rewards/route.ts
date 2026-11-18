// Parent-only access is enforced by src/proxy.ts.
export { GET } from "../../rewards/route";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let input: unknown;
  try { input = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: "Invalid prize details" }, { status: 400 });
  }
  const data = input as Record<string, unknown>;
  const category = data.category;
  if (category !== undefined && (typeof category !== "string" || category.trim().length > 60)) {
    return NextResponse.json({ error: "Category must be at most 60 characters." }, { status: 400 });
  }
  const imageURL = data.imageURL;
  if (imageURL !== undefined && (typeof imageURL !== "string" || !/^\/api\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/.test(imageURL))) {
    return NextResponse.json({ error: "Upload a valid prize photo." }, { status: 400 });
  }
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const icon = typeof data.icon === "string" ? data.icon.trim() : "🎁";
  if (!title || title.length > 150 || description.length > 1000 || !icon || icon.length > 20 ||
      typeof data.starCost !== "number" || !Number.isSafeInteger(data.starCost) || data.starCost < 1 || data.starCost > 1000000 ||
      typeof data.monthlyStock !== "number" || !Number.isSafeInteger(data.monthlyStock) || data.monthlyStock < 1 || data.monthlyStock > 1000000 ||
      (data.isGroup !== undefined && typeof data.isGroup !== "boolean")) {
    return NextResponse.json({ error: "Enter a valid title, cost and stock (at least 1)" }, { status: 400 });
  }
  try {
    const reward = await prisma.reward.create({ data: {
      title, description: description || null, icon, imageURL, category: category?.trim() || null,
      starCost: data.starCost, monthlyStock: data.monthlyStock, currentStock: data.monthlyStock,
      isGroup: data.isGroup === true,
    } });
    return NextResponse.json(reward, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to save prize" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const input: unknown = await req.json().catch(() => null);
  if (!input || typeof input !== "object" || !("id" in input) ||
      typeof input.id !== "string" || !input.id || !("isVisible" in input) ||
      typeof input.isVisible !== "boolean") {
    return NextResponse.json({ error: "A prize ID and visibility are required." }, { status: 400 });
  }

  try {
    const result = await prisma.reward.updateMany({
      where: { id: input.id, isGroup: false },
      data: { isVisible: input.isVisible },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Prize not found." }, { status: 404 });
    }
    return NextResponse.json({ isVisible: input.isVisible });
  } catch {
    return NextResponse.json({ error: "Unable to update prize visibility." }, { status: 500 });
  }
}
