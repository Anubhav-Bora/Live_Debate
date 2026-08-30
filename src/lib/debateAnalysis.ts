import { prisma } from "@/lib/prisma";
import { judgeDebate, type DebateJudgement } from "../../lib/ai-judge";
import type { Prisma } from "@prisma/client";

type InsufficientFeedback = {
  status: "insufficient";
  winner: null;
  summary: string;
  pro: { joined: boolean; score?: null };
  con: { joined: boolean; score?: null };
  generatedAt: string;
};

function scoreData(participant: DebateJudgement["pro"]) {
  return {
    logic: participant.logic,
    clarity: participant.clarity,
    persuasiveness: participant.persuasiveness,
    tone: participant.tone,
  };
}

export async function generateAndPersistAnalysis(debateId: string) {
  const claim = await prisma.debate.updateMany({
    where: { id: debateId, status: "completed", analysisStatus: { in: ["idle", "failed"] } },
    data: { analysisStatus: "analyzing" },
  });
  if (claim.count !== 1) throw new Error("Analysis is already in progress or the debate is unavailable");

  const debate = await prisma.debate.findUnique({
    where: { id: debateId },
    include: {
      proUser: true,
      conUser: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
    },
  });
  if (!debate) throw new Error("Debate not found");
  if (debate.status !== "completed") throw new Error("The debate must end before it can be judged");

  if (!debate.proUser || !debate.conUser) {
    const feedback: InsufficientFeedback = {
      status: "insufficient",
      winner: null,
      summary: "Both participants must join before a debate can be judged.",
      pro: { joined: Boolean(debate.proUser) },
      con: { joined: Boolean(debate.conUser) },
      generatedAt: new Date().toISOString(),
    };
    await prisma.debate.update({
      where: { id: debateId },
      data: { aiFeedback: feedback, analysisStatus: "completed", winner: null },
    });
    return feedback;
  }

  const evidenceLength = (role: "pro" | "con", transcript: string) =>
    transcript.length + debate.messages
      .filter((message) => message.role === role)
      .reduce((total, message) => total + message.content.length, 0);

  if (evidenceLength("pro", debate.proTranscript) < 20 || evidenceLength("con", debate.conTranscript) < 20) {
    const feedback: InsufficientFeedback = {
      status: "insufficient",
      winner: null,
      summary: "There was not enough recorded argument from both sides to select a fair winner.",
      pro: { joined: true, score: null },
      con: { joined: true, score: null },
      generatedAt: new Date().toISOString(),
    };
    await prisma.debate.update({
      where: { id: debateId },
      data: { aiFeedback: feedback, analysisStatus: "completed", winner: null },
    });
    return feedback;
  }

  try {
    const feedback = await judgeDebate({
      topic: debate.topic,
      proTranscript: debate.proTranscript,
      conTranscript: debate.conTranscript,
      messages: debate.messages,
    });
    const proScore = scoreData(feedback.pro);
    const conScore = scoreData(feedback.con);
    await prisma.$transaction([
      prisma.debate.update({
        where: { id: debateId },
        data: {
          aiFeedback: feedback as unknown as Prisma.InputJsonValue,
          analysisStatus: "completed",
          winner: feedback.winner,
        },
      }),
      prisma.score.upsert({
        where: { userId_debateId: { userId: debate.proUser.id, debateId } },
        create: { ...proScore, userId: debate.proUser.id, debateId },
        update: proScore,
      }),
      prisma.score.upsert({
        where: { userId_debateId: { userId: debate.conUser.id, debateId } },
        create: { ...conScore, userId: debate.conUser.id, debateId },
        update: conScore,
      }),
    ]);
    return feedback;
  } catch (error) {
    await prisma.debate.update({
      where: { id: debateId },
      data: {
        analysisStatus: "failed",
        winner: null,
        aiFeedback: {
          status: "failed",
          winner: null,
          message: "AI analysis could not be completed. You can safely retry.",
          retryable: true,
          generatedAt: new Date().toISOString(),
        },
      },
    });
    throw error;
  }
}
