import type { PrismaClient } from "@prisma/client";
import type { DebateJudgement } from "./ai-judge";

export type InsufficientFeedback = {
  status: "insufficient";
  winner: null;
  summary: string;
  pro: { joined: boolean; score?: null };
  con: { joined: boolean; score?: null };
  generatedAt: string;
};

export type FailedFeedback = {
  status: "failed";
  winner: null;
  message: string;
  retryable: true;
  generatedAt: string;
};

export class AnalysisConflictError extends Error {
  code: "ANALYSIS_CONFLICT";
}

export function failedFeedback(): FailedFeedback;

export function generateAndPersistAnalysis(input: {
  prisma: PrismaClient;
  debateId: string;
}): Promise<DebateJudgement | InsufficientFeedback>;
