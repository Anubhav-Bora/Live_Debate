const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ path: ".env", quiet: true });

const prisma = new PrismaClient();

async function main() {
  const [database] = await prisma.$queryRawUnsafe(
    "SELECT current_database() AS database, current_schema() AS schema",
  );
  const columns = await prisma.$queryRawUnsafe(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'Debate'",
  );
  const [duplicates] = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*)::int AS count FROM (SELECT "userId", "debateId" FROM "Score" GROUP BY "userId", "debateId" HAVING COUNT(*) > 1) duplicate_groups',
  );
  console.log(JSON.stringify({
    connected: true,
    database: database.database,
    schema: database.schema,
    analysisColumnsPresent: ["analysisStatus", "winner", "proTranscript", "conTranscript"].every((column) =>
      columns.some((entry) => entry.column_name === column),
    ),
    duplicateScoreGroups: duplicates.count,
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
