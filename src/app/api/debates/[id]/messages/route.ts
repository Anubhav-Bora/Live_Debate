import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rateLimit";
import { emitDebateEvent } from "@/lib/realtime";
import { isSafeIdentifier, readJsonObject } from "@/lib/request";

async function canAccessDebate(debateId: string, user: { id: string } | null) {
  const debate = await prisma.debate.findUnique({
    where: { id: debateId },
    select: { isPublic: true, proUserId: true, conUserId: true, status: true },
  });
  if (!debate) return { debate: null, user: null };
  const participant = Boolean(user && [debate.proUserId, debate.conUserId].includes(user.id));
  return { debate: debate.isPublic || participant ? debate : null, user };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isSafeIdentifier(id)) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    const user = await getCurrentUser();
    const { debate } = await canAccessDebate(id, user);
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    const messages = await prisma.message.findMany({
      where: { debateId: id },
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
        sender: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    return NextResponse.json(messages, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not fetch messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!isSafeIdentifier(id)) return NextResponse.json({ error: "Invalid debate ID" }, { status: 400 });
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowRequest(`message:${user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "You are sending messages too quickly." }, { status: 429 });
    }
    const body = await readJsonObject<{ content?: unknown }>(request);
    if (!body) return NextResponse.json({ error: "A valid JSON request is required." }, { status: 400 });
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 2_000) {
      return NextResponse.json({ error: "Message must be between 1 and 2,000 characters." }, { status: 400 });
    }
    const debate = await prisma.debate.findUnique({
      where: { id },
      select: { status: true, proUserId: true, conUserId: true },
    });
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    const role = debate.proUserId === user.id ? "pro" : debate.conUserId === user.id ? "con" : null;
    if (!role) return NextResponse.json({ error: "Only participants can send messages." }, { status: 403 });
    if (debate.status !== "in-progress") {
      return NextResponse.json({ error: "Messages can only be sent during an active debate." }, { status: 409 });
    }
    const message = await prisma.message.create({
      data: { content, role, debateId: id, senderId: user.id },
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
        sender: { select: { id: true, username: true } },
      },
    });
    emitDebateEvent(id, "new_message", message);
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Could not create message:", error);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
