/*
  Warnings:

  - You are about to drop the column `joinCode` on the `Debate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[joinCodeCon]` on the table `Debate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[joinCodeJudge]` on the table `Debate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `joinCodeCon` to the `Debate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `joinCodeJudge` to the `Debate` table without a default value. This is not possible if the table is not empty.
  - Made the column `proUserId` on table `Debate` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Debate" DROP CONSTRAINT "Debate_proUserId_fkey";

-- DropIndex
DROP INDEX "Debate_joinCode_key";

-- AlterTable
ALTER TABLE "Debate" DROP COLUMN "joinCode",
ADD COLUMN     "joinCodeCon" TEXT NOT NULL,
ADD COLUMN     "joinCodeJudge" TEXT NOT NULL,
ADD COLUMN     "judgeId" TEXT,
ALTER COLUMN "proUserId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Debate_joinCodeCon_key" ON "Debate"("joinCodeCon");

-- CreateIndex
CREATE UNIQUE INDEX "Debate_joinCodeJudge_key" ON "Debate"("joinCodeJudge");

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_proUserId_fkey" FOREIGN KEY ("proUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
