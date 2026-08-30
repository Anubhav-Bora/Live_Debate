require("dotenv").config({ path: ".env.local", quiet: true });
require("dotenv").config({ path: ".env", quiet: true });
require("dotenv").config({ path: ".env.ai.local", override: true, quiet: true });
const { judgeDebate } = require("../lib/ai-judge");

async function main() {
  const result = await judgeDebate({
    topic: "Schools should require a practical financial literacy course.",
    proTranscript: "A required course would teach budgeting, compound interest, taxes, and credit before students make costly decisions. Schools already teach civic essentials, and financial literacy is similarly universal.",
    conTranscript: "A national requirement may crowd out local priorities. Financial lessons become outdated, and families have different circumstances, so schools should offer an elective with flexible community partnerships instead.",
    messages: [],
  });
  console.log(JSON.stringify({
    connected: true,
    model: result.model,
    structuredResult: Boolean(result.pro?.score >= 0 && result.con?.score >= 0 && result.winner),
    winnerSelected: result.winner,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
