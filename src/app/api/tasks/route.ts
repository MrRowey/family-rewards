import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tasks -> Fetch all tasks
export async function GET() {
    try {
        const tasks = await prisma.task.findMany({
            include: { subSteps: { orderBy: { order: "asc"}}},
            orderBy: { minAge: "asc"},
        });
        return NextResponse.json(tasks);
    }    catch (error) {
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

// POST /api/tasks -> Add task to vault with sub-steps and age bracket
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, icon, starValue, minAge, maxAge, subSteps } = body;

        const newTask = await prisma.task.create({
            data: {
                title,
                icon: icon || "⭐",
                starValue: parseInt(starValue) || 1,
                minAge: parseInt(minAge) || 2,
                maxAge: parseInt(maxAge) || 18,
                subSteps: {
                    create: subSteps?.map((s: string, idx: number) => ({
                        title: s,
                        order: idx + 1,
                    })),
                },
            },
            include: { subSteps: true },
        });

        return NextResponse.json(newTask);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}
