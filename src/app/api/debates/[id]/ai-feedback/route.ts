import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalysisConflictError, generateAndPersistAnalysis } from "@/lib/debateAnalysis";
import { allowRequest } from "@/lib/rateLimit";
import { emitDashboardUpdated, emitDebateEvent } from "@/lib/realtime";
import { isSafeIdentifier } from "@/lib/request";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSafeIdentifier(id)) return NextResponse.json({ error: "Invalid debate ID" }, { status: 400 });
  try {
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
    emitDebateEvent(id, "debate_feedback", feedback);
    emitDashboardUpdated({ debateId: id, winner: feedback.winner, analysisStatus: "completed" });
    return NextResponse.json(feedback);
  } catch (error) {
    if (error instanceof AnalysisConflictError || (error as { code?: string })?.code === "ANALYSIS_CONFLICT") {
      return NextResponse.json({ error: "Analysis is already in progress." }, { status: 409 });
    }
    console.error("Could not generate debate analysis:", error);
    const failed = await prisma.debate.findUnique({
      where: { id },
      select: { aiFeedback: true, analysisStatus: true },
    }).catch(() => null);
    if (failed?.analysisStatus === "failed" && failed.aiFeedback) {
      emitDebateEvent(id, "debate_feedback", failed.aiFeedback);
      emitDashboardUpdated({ debateId: id, winner: null, analysisStatus: "failed" });
    }
    return NextResponse.json(
      { error: "AI analysis could not be completed. Check the server configuration and retry." },
      { status: 502 },
    );
  }
}
