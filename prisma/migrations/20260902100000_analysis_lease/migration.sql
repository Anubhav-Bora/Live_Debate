-- Track when an AI job was claimed so a new process only recovers genuinely
-- interrupted work instead of competing with a healthy instance during deploys.
ALTER TABLE "Debate" ADD COLUMN "analysisStartedAt" TIMESTAMP(3);
