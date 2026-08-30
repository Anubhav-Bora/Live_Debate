import { timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rateLimit";

function secureCodeMatch(value: string, expected: string) {
  const provided = Buffer.from(value.trim().toUpperCase());
  const stored = Buffer.from(expected);
  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

async function currentDatabaseUser() {
  return { user: await getCurrentUser() };
}

const publicSelect = {
  id: true,
  topic: true,
  status: true,
  analysisStatus: true,
  winner: true,
  duration: true,
  isPublic: true,
  proDisplayName: true,
  startTime: true,
  endTime: true,
  createdAt: true,
  aiFeedback: true,
  proTranscript: true,
  conTranscript: true,
  joinCodeCon: true,
  creatorId: true,
  proUserId: true,
  conUserId: true,
  proUser: { select: { id: true, username: true } },
  conUser: { select: { id: true, username: true } },
} as const;

type SelectedDebate = Prisma.DebateGetPayload<{ select: typeof publicSelect }>;

function safeDebateResponse(debate: SelectedDebate, userId: string | null, includeJoinCode = false) {
  const viewerRole = userId === debate.proUserId ? "pro" : userId === debate.conUserId ? "con" : "viewer";
  const participant = viewerRole !== "viewer";
  return {
    id: debate.id,
    topic: debate.topic,
    status: debate.status,
    analysisStatus: debate.analysisStatus,
    winner: debate.winner,
    duration: debate.duration,
    isPublic: debate.isPublic,
    proDisplayName: debate.proDisplayName,
    startTime: debate.startTime,
    endTime: debate.endTime,
    createdAt: debate.createdAt,
    aiFeedback: debate.aiFeedback,
    proTranscript: participant || debate.status === "completed" ? debate.proTranscript : undefined,
    conTranscript: participant || debate.status === "completed" ? debate.conTranscript : undefined,
    proUser: debate.proUser,
    conUser: debate.conUser,
    viewerRole,
    canDelete: userId === debate.creatorId,
    ...(includeJoinCode ? { joinCodeCon: debate.joinCodeCon } : {}),
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user } = await currentDatabaseUser();
    const debate = await prisma.debate.findUnique({ where: { id }, select: publicSelect });
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    const isParticipant = Boolean(user && [debate.creatorId, debate.proUserId, debate.conUserId].includes(user.id));
    if (!debate.isPublic && !isParticipant) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    const canSeePrivateData = Boolean(user && debate.creatorId === user.id);
    return NextResponse.json(safeDebateResponse(debate, user?.id || null, canSeePrivateData), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not fetch debate:", error);
    return NextResponse.json({ error: "Failed to fetch debate" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowRequest(`join:${user.id}:${id}`, 8, 60_000)) {
      return NextResponse.json({ error: "Too many join attempts. Please wait a minute." }, { status: 429 });
    }

    const body = (await request.json()) as { action?: unknown; joinCode?: unknown };
    if (body.action !== "join_con") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const joinCode = typeof body.joinCode === "string" ? body.joinCode : "";
    const debate = await prisma.debate.findUnique({ where: { id } });
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    if (debate.status !== "waiting" || debate.conUserId) {
      return NextResponse.json({ error: "The Con position is no longer available." }, { status: 409 });
    }
    if (debate.proUserId === user.id) {
      return NextResponse.json({ error: "The Pro participant cannot also join as Con." }, { status: 400 });
    }
    if (!secureCodeMatch(joinCode, debate.joinCodeCon)) {
      return NextResponse.json({ error: "Invalid join code" }, { status: 400 });
    }

    const claim = await prisma.debate.updateMany({
      where: { id, status: "waiting", conUserId: null },
      data: { conUserId: user.id },
    });
    if (claim.count !== 1) {
      return NextResponse.json({ error: "Another participant already claimed the Con position." }, { status: 409 });
    }
    const updated = await prisma.debate.findUnique({ where: { id }, select: publicSelect });
    if (!updated) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    return NextResponse.json(safeDebateResponse(updated, user.id));
  } catch (error) {
    console.error("Could not join debate:", error);
    return NextResponse.json({ error: "Could not join the debate." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const debate = await prisma.debate.findUnique({ where: { id }, select: { creatorId: true, status: true } });
    if (!debate || debate.creatorId !== user.id) {
      return NextResponse.json({ error: "Not authorized to delete this debate." }, { status: 403 });
    }
    if (debate.status === "in-progress") {
      return NextResponse.json({ error: "An active debate cannot be deleted." }, { status: 409 });
    }
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { debateId: id } }),
      prisma.score.deleteMany({ where: { debateId: id } }),
      prisma.vote.deleteMany({ where: { debateId: id } }),
      prisma.debate.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete debate:", error);
    return NextResponse.json({ error: "Could not delete the debate." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as { action?: unknown };
    const debate = await prisma.debate.findUnique({ where: { id } });
    if (!debate || debate.creatorId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (body.action !== "remove_con" || debate.status !== "waiting" || !debate.conUserId) {
      return NextResponse.json({ error: "The participant cannot be removed now." }, { status: 409 });
    }
    const updated = await prisma.debate.update({
      where: { id },
      data: { conUserId: null },
      select: publicSelect,
    });
    return NextResponse.json(safeDebateResponse(updated, user.id, true));
  } catch (error) {
    console.error("Could not update debate:", error);
    return NextResponse.json({ error: "Could not update the debate." }, { status: 500 });
  }
}
