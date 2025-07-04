-- AlterTable
ALTER TABLE "Debate" ADD COLUMN     "aiFeedback" JSONB,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "startTime" TIMESTAMP(3);
