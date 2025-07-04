/*
  Warnings:

  - You are about to drop the column `joinCodeJudge` on the `Debate` table. All the data in the column will be lost.
  - You are about to drop the column `judgeId` on the `Debate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Debate" DROP CONSTRAINT "Debate_judgeId_fkey";

-- DropIndex
DROP INDEX "Debate_joinCodeJudge_key";

-- AlterTable
ALTER TABLE "Debate" DROP COLUMN "joinCodeJudge",
DROP COLUMN "judgeId",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
