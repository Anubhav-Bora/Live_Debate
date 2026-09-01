import { prisma } from "@/lib/prisma";
import {
  AnalysisConflictError,
  generateAndPersistAnalysis as runPersistedAnalysis,
} from "../../lib/debate-analysis";

export { AnalysisConflictError };

export function generateAndPersistAnalysis(debateId: string) {
  return runPersistedAnalysis({ prisma, debateId });
}
