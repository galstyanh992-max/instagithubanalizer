import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const tasks = await db.userTask.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[tasks GET]", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title } = await req.json();
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }
    const task = await db.userTask.create({
      data: { title },
    });
    return NextResponse.json({ task });
  } catch (error) {
    console.error("[tasks POST]", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, completed } = await req.json();
    if (!id || typeof completed !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const task = await db.userTask.update({
      where: { id },
      data: { completed },
    });
    return NextResponse.json({ task });
  } catch (error) {
    console.error("[tasks PATCH]", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
