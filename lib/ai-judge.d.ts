export interface JudgedParticipant {
  score: number;
  logic: number;
  clarity: number;
  persuasiveness: number;
  tone: number;
  mistakes: string[];
  improvements: string[];
  feedback: string;
}

export interface DebateJudgement {
  status: "completed";
  winner: "pro" | "con" | "tie";
  summary: string;
  confidence: number;
  pro: JudgedParticipant;
  con: JudgedParticipant;
  generatedAt: string;
  model: string;
}

export function judgeDebate(input: {
  topic: string;
  proTranscript: string;
  conTranscript: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<DebateJudgement>;
