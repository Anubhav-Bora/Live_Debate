-- Index the filters and relation lookups used by debate discovery, recovery,
-- transcript/chat loading, profiles, and rankings.
CREATE INDEX "Debate_status_createdAt_idx" ON "Debate"("status", "createdAt");
CREATE INDEX "Debate_creatorId_idx" ON "Debate"("creatorId");
CREATE INDEX "Debate_proUserId_idx" ON "Debate"("proUserId");
CREATE INDEX "Debate_conUserId_idx" ON "Debate"("conUserId");
CREATE INDEX "Message_debateId_createdAt_idx" ON "Message"("debateId", "createdAt");
CREATE INDEX "Score_createdAt_idx" ON "Score"("createdAt");
CREATE INDEX "Score_userId_createdAt_idx" ON "Score"("userId", "createdAt");
CREATE INDEX "Score_debateId_idx" ON "Score"("debateId");
