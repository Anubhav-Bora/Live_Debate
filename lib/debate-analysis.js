const { judgeDebate } = require("./ai-judge");
const { awardAchievements } = require("./achievements");

class AnalysisConflictError extends Error {
  constructor(message = "Analysis is already in progress or unavailable.") {
    super(message);
    this.name = "AnalysisConflictError";
    this.code = "ANALYSIS_CONFLICT";
  }
}

function scoreWrite(prisma, userId, debateId, participant) {
  const data = {
    logic: participant.logic,
    clarity: participant.clarity,
    persuasiveness: participant.persuasiveness,
    tone: participant.tone,
  };
  return prisma.score.upsert({
    where: { userId_debateId: { userId, debateId } },
    create: { ...data, userId, debateId },
    update: data,
  });
}

function insufficientFeedback(summary, pro, con) {
  return {
    status: "insufficient",
    winner: null,
    summary,
    pro,
    con,
    generatedAt: new Date().toISOString(),
  };
}

function failedFeedback() {
  return {
    status: "failed",
    winner: null,
    message: "AI analysis could not be completed. You can safely retry.",
    retryable: true,
    generatedAt: new Date().toISOString(),
  };
}

async function generateAndPersistAnalysis({ prisma, debateId }) {
  const claim = await prisma.debate.updateMany({
    where: {
      id: debateId,
      status: "completed",
      analysisStatus: { in: ["idle", "failed"] },
    },
    data: { analysisStatus: "analyzing", analysisStartedAt: new Date() },
  });
  if (claim.count !== 1) throw new AnalysisConflictError();

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
  if (!debate) throw new Error("Debate not found after analysis was claimed.");

  try {
    if (!debate.proUser || !debate.conUser) {
      const feedback = insufficientFeedback(
        "Both participants must join before a debate can be judged.",
        { joined: Boolean(debate.proUser) },
        { joined: Boolean(debate.conUser) },
      );
      await prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback: feedback, analysisStatus: "completed", analysisStartedAt: null, winner: null },
      });
      return feedback;
    }

    const evidenceLength = (role, transcript) =>
      transcript.length + debate.messages
        .filter((message) => message.role === role)
        .reduce((total, message) => total + message.content.length, 0);

    if (evidenceLength("pro", debate.proTranscript) < 20 || evidenceLength("con", debate.conTranscript) < 20) {
      const feedback = insufficientFeedback(
        "There was not enough recorded argument from both sides to select a fair winner.",
        { joined: true, score: null },
        { joined: true, score: null },
      );
      await prisma.debate.update({
        where: { id: debateId },
        data: { aiFeedback: feedback, analysisStatus: "completed", analysisStartedAt: null, winner: null },
      });
      return feedback;
    }

    const feedback = await judgeDebate({
      topic: debate.topic,
      proTranscript: debate.proTranscript,
      conTranscript: debate.conTranscript,
      messages: debate.messages,
    });
    await prisma.$transaction(async (database) => {
      await database.debate.update({
        where: { id: debateId },
        data: {
          aiFeedback: feedback,
          analysisStatus: "completed",
          analysisStartedAt: null,
          winner: feedback.winner,
        },
      });
      await Promise.all([
        scoreWrite(database, debate.proUser.id, debateId, feedback.pro),
        scoreWrite(database, debate.conUser.id, debateId, feedback.con),
      ]);
      await awardAchievements(database, [debate.proUser.id, debate.conUser.id]);
    }, { timeout: 15_000 });
    return feedback;
  } catch (error) {
    const feedback = failedFeedback();
    await prisma.debate.updateMany({
      where: { id: debateId, analysisStatus: "analyzing" },
      data: { aiFeedback: feedback, analysisStatus: "failed", analysisStartedAt: null, winner: null },
    }).catch(() => undefined);
    throw error;
  }
}

module.exports = {
  AnalysisConflictError,
  failedFeedback,
  generateAndPersistAnalysis,
};
