import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSafeIdentifier } from "@/lib/request";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    if (!isSafeIdentifier(userId)) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const [user, scoreSummary] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          createdAt: true,
          _count: { select: { scores: true } },
          scores: {
            select: {
              logic: true,
              clarity: true,
              persuasiveness: true,
              tone: true,
              createdAt: true,
              debate: { select: { id: true, topic: true, winner: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          userBadges: {
            select: {
              earnedAt: true,
              badge: { select: { id: true, name: true, description: true, icon: true } },
            },
            orderBy: { earnedAt: "desc" },
          },
        },
      }),
      prisma.score.aggregate({
        where: { userId },
        _avg: { logic: true, clarity: true, persuasiveness: true, tone: true },
      }),
    ]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const categoryAverages = Object.values(scoreSummary._avg).filter(
      (score): score is number => typeof score === "number",
    );
    const totalScore = categoryAverages.length
      ? categoryAverages.reduce((total, score) => total + score, 0) / categoryAverages.length
      : 0;
    return NextResponse.json({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      scores: user.scores,
      badges: user.userBadges.map(({ badge, earnedAt }) => ({ ...badge, earnedAt })),
      totalScore,
      debateCount: user._count.scores,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not fetch profile:", error);
    return NextResponse.json({ error: "Could not fetch user profile" }, { status: 500 });
  }
}
