import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SubStepImport {
  title: string;
}

interface TaskImportItem {
  title: string;
  icon?: string;
  starValue?: number | string;
  subSteps?: Array<string | SubStepImport>;
}

interface RewardImportItem {
  title: string;
  description?: string;
  icon?: string;
  starCost?: number | string;
  monthlyStock?: number | string;
  isGroup?: boolean;
  isVisible?: boolean;
}

export async function POST(req: Request) {
  try {
    const { type, items } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid or empty dataset" }, { status: 400 });
    }

    if (type === "TASKS") {
      const taskItems = items as TaskImportItem[];

      for (const item of taskItems) {
        const subStepsData = item.subSteps?.map((s, idx) => ({
          title: typeof s === "string" ? s : s.title,
          order: idx,
        }));

        await prisma.task.create({
          data: {
            title: item.title,
            icon: item.icon || "⭐",
            starValue: Number(item.starValue || 1),
            subSteps: subStepsData && subStepsData.length > 0
              ? { create: subStepsData }
              : undefined,
          },
        });
      }
      return NextResponse.json({ message: `Successfully imported ${items.length} tasks` });
    }

    if (type === "REWARDS") {
      const rewardItems = items as RewardImportItem[];

      for (const item of rewardItems) {
        await prisma.reward.create({
          data: {
            title: item.title,
            description: item.description || null,
            icon: item.icon || "🎁",
            starCost: Number(item.starCost || 5),
            monthlyStock: Number(item.monthlyStock || 1),
            currentStock: Number(item.monthlyStock || 1),
            isGroup: Boolean(item.isGroup),
            isVisible: item.isVisible !== undefined ? Boolean(item.isVisible) : true,
          },
        });
      }
      return NextResponse.json({ message: `Successfully imported ${items.length} rewards` });
    }

    return NextResponse.json({ error: "Invalid import type" }, { status: 400 });
  } catch (err) {
    console.error("Bulk Import Error:", err);
    return NextResponse.json({ error: "Failed to process bulk import" }, { status: 500 });
  }
}