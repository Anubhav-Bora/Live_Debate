const baseUrl = process.env.CHECK_BASE_URL || "http://127.0.0.1:3000";

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body, text };
}

async function main() {
  const health = await request("/api/health");
  const leaderboard = await request("/api/leaderboard?range=all");
  const debates = await request("/api/debates");
  const firstDebateId = Array.isArray(debates.body) ? debates.body[0]?.id : null;
  const debateDetail = firstDebateId ? await request(`/api/debates/${encodeURIComponent(firstDebateId)}`) : null;
  const firstUserId = Array.isArray(leaderboard.body?.leaderboard) ? leaderboard.body.leaderboard[0]?.id : null;
  const profile = firstUserId ? await request(`/api/users/${encodeURIComponent(firstUserId)}`) : null;
  const legacyAi = await request("/api/ai-feedback", { method: "POST" });
  const unauthenticatedCreate = await request("/api/debates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic: "This request must be rejected", duration: 300 }),
  });

  const checks = {
    health: health.response.status === 200 && health.body?.database === "connected",
    leaderboardShape: leaderboard.response.status === 200 && Array.isArray(leaderboard.body?.leaderboard),
    debateList: debates.response.status === 200 && Array.isArray(debates.body),
    debateDetail: !debateDetail || debateDetail.response.status === 200,
    profileShape: !profile || (profile.response.status === 200 && typeof profile.body?.debateCount === "number"),
    noPrivateIdentifiers:
      !debates.text.includes("joinCodeCon") &&
      !debates.text.includes("clerkId") &&
      (!debateDetail || (!Object.hasOwn(debateDetail.body, "joinCodeCon") && !debateDetail.text.includes("clerkId"))) &&
      (!profile || (!Object.hasOwn(profile.body, "email") && !Object.hasOwn(profile.body, "clerkId"))),
    legacyAiClosed: legacyAi.response.status === 410,
    unauthenticatedCreateBlocked: unauthenticatedCreate.response.status === 401,
    securityHeader: health.response.headers.get("x-content-type-options") === "nosniff",
  };

  console.log(JSON.stringify({ connected: true, checks }));
  if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
