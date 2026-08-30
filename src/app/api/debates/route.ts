import { randomInt } from "crypto";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rateLimit";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(length = 8) {
  return Array.from({ length }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const participantFilter: Prisma.DebateWhereInput[] = user
      ? [{ creatorId: user.id }, { proUserId: user.id }, { conUserId: user.id }]
      : [];

    const debates = await prisma.debate.findMany({
      where: { OR: [{ isPublic: true }, ...participantFilter] },
      select: {
        id: true,
        topic: true,
        status: true,
        analysisStatus: true,
        winner: true,
        duration: true,
        isPublic: true,
        createdAt: true,
        creatorId: true,
        proUser: { select: { username: true } },
        conUser: { select: { username: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(debates.map(({ creatorId, ...debate }) => ({
      ...debate,
      canDelete: user?.id === creatorId,
    })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not list debates:", error);
    return NextResponse.json({ error: "Failed to fetch debates" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowRequest(`create:${user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: "Too many debates created. Please wait a minute." }, { status: 429 });
    }

    const body = (await request.json()) as { topic?: unknown; duration?: unknown; isPublic?: unknown };
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const duration = Number(body.duration);
    if (topic.length < 5 || topic.length > 240) {
      return NextResponse.json({ error: "Topic must be between 5 and 240 characters." }, { status: 400 });
    }
    if (!Number.isInteger(duration) || duration < 60 || duration > 7_200) {
      return NextResponse.json({ error: "Duration must be between 1 minute and 2 hours." }, { status: 400 });
    }

    const debate = await prisma.debate.create({
      data: {
        topic,
        duration,
        joinCodeCon: generateCode(),
        isPublic: body.isPublic !== false,
        creatorId: user.id,
        proUserId: user.id,
        proDisplayName: user.username,
      },
      select: { id: true, joinCodeCon: true, duration: true, topic: true, isPublic: true },
    });
    return NextResponse.json(debate, { status: 201 });
  } catch (error) {
    console.error("Could not create debate:", error);
    return NextResponse.json({ error: "Could not create the debate." }, { status: 500 });
  }
}
