import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const requestedRange = new URL(request.url).searchParams.get("range");
    const range = requestedRange === "month" || requestedRange === "all" ? requestedRange : "week";
    const since = range === "week"
      ? new Date(Date.now() - 7 * 86_400_000)
      : range === "month"
        ? new Date(Date.now() - 30 * 86_400_000)
        : new Date(0);

    const users = await prisma.user.findMany({
      where: { scores: { some: { createdAt: { gte: since } } } },
      select: {
        id: true,
        username: true,
        scores: {
          where: { createdAt: { gte: since } },
          select: { logic: true, clarity: true, persuasiveness: true, tone: true },
        },
        userBadges: { select: { id: true } },
      },
    });

    const leaderboard = users
      .map((user) => {
        const total = user.scores.reduce(
          (sum, score) => sum + (score.logic + score.clarity + score.persuasiveness + score.tone) / 4,
          0,
        );
        return {
          id: user.id,
          username: user.username,
          totalScore: Number((total / user.scores.length).toFixed(2)),
          debateCount: user.scores.length,
          badges: user.userBadges.length,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore || b.debateCount - a.debateCount);

    const completedDebates = await prisma.debate.count({
      where: { status: "completed", endTime: { gte: since } },
    });
    return NextResponse.json({
      leaderboard,
      range,
      summary: { totalPlayers: leaderboard.length, completedDebates },
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not build leaderboard:", error);
    return NextResponse.json({ error: "Could not load leaderboard" }, { status: 500 });
  }
}
