import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAndPersistAnalysis } from "@/lib/debateAnalysis";
import { allowRequest } from "@/lib/rateLimit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowRequest(`analysis:${user.id}:${id}`, 3, 5 * 60_000)) {
      return NextResponse.json({ error: "Please wait before requesting another analysis." }, { status: 429 });
    }
    const debate = await prisma.debate.findUnique({
      where: { id },
      select: { status: true, analysisStatus: true, aiFeedback: true, creatorId: true, proUserId: true, conUserId: true },
    });
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    if (![debate.creatorId, debate.proUserId, debate.conUserId].includes(user.id)) {
      return NextResponse.json({ error: "Only debate participants can retry analysis." }, { status: 403 });
    }
    if (debate.status !== "completed") {
      return NextResponse.json({ error: "The debate has not ended yet." }, { status: 409 });
    }
    if (debate.analysisStatus === "analyzing") {
      return NextResponse.json({ error: "Analysis is already in progress." }, { status: 409 });
    }
    if (debate.analysisStatus === "completed" && debate.aiFeedback) {
      return NextResponse.json({ error: "Analysis is already available." }, { status: 409 });
    }
    const feedback = await generateAndPersistAnalysis(id);
    const realtime = (globalThis as typeof globalThis & {
      debateRealtime?: {
        to(room: string): { emit(event: string, payload: unknown): void };
        emit(event: string, payload: unknown): void;
      };
    }).debateRealtime;
    realtime?.to(`debate_${id}`).emit("debate_feedback", feedback);
    realtime?.emit("dashboard_updated", { debateId: id, winner: feedback.winner });
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Could not generate debate analysis:", error);
    return NextResponse.json(
      { error: "AI analysis could not be completed. Check the server configuration and retry." },
      { status: 502 },
    );
  }
}
