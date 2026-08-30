ALTER TABLE "Debate"
ADD COLUMN "analysisStatus" TEXT NOT NULL DEFAULT 'idle',
ADD COLUMN "winner" TEXT,
ADD COLUMN "proTranscript" TEXT NOT NULL DEFAULT '',
ADD COLUMN "conTranscript" TEXT NOT NULL DEFAULT '';

-- Older versions could insert the same participant score more than once.
DELETE FROM "Score" current_score
USING "Score" duplicate_score
WHERE current_score."userId" = duplicate_score."userId"
  AND current_score."debateId" = duplicate_score."debateId"
  AND current_score."createdAt" < duplicate_score."createdAt";

CREATE UNIQUE INDEX "Score_userId_debateId_key"
ON "Score"("userId", "debateId");
