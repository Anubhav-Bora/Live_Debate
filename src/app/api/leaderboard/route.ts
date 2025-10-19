import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "week";

    const dateFilter = {
      week: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      all: new Date(0),
    }[range as "week" | "month" | "all"];

    // Step 1: Get users with related scores filtered by date
    const users = await prisma.user.findMany({
      where: {
        scores: {
          some: {
            createdAt: {
              gte: dateFilter,
            },
          },
        },
      },
      include: {
        scores: {
          where: {
            createdAt: {
              gte: dateFilter,
            },
          },
          select: {
            logic: true,
            clarity: true,
            persuasiveness: true,
            tone: true,
          },
        },
        _count: {
          select: {
            debatesPro: {
              where: {
                createdAt: {
                  gte: dateFilter,
                },
              },
            },
            debatesCon: {
              where: {
                createdAt: {
                  gte: dateFilter,
                },
              },
            },
          },
        },
      },
    });

    // Step 2: Get badge counts separately
    const userIds = users.map(user => user.id);
    const badgeCounts = await prisma.userBadge.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        earnedAt: { gte: dateFilter }
      },
      _count: { id: true }
    });

    // Create a map for quick lookup
    const badgeCountMap = new Map(
      badgeCounts.map(item => [item.userId, item._count.id])
    );

    // Step 3: Calculate average score per user
    const formatted = users
      .map((user) => {
        const scoreCount = user.scores.length;
        if (scoreCount === 0) return null;

        const totalAverage =
          user.scores.reduce((acc, score) => {
            const avgScore = (score.logic + score.clarity + score.persuasiveness + (score.tone || 5)) / 4;
            return acc + avgScore;
          }, 0) / scoreCount;

        return {
          id: user.id,
          username: user.username,
          totalScore: Number(totalAverage.toFixed(2)),
          debateCount: user._count.debatesPro + user._count.debatesCon,
          badges: badgeCountMap.get(user.id) || 0,
          status: 'active',
        };
      })
      .filter((user) => user !== null)
      .sort((a, b) => b.totalScore - a.totalScore);

    // Step 4: Get recent incomplete debates (missing participants)
    const incompletedebates = await prisma.debate.findMany({
      where: {
        createdAt: { gte: dateFilter },
        status: 'completed',
      },
      include: {
        proUser: { select: { id: true, username: true } },
        conUser: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const missingParticipantsInfo = incompletedebates
      .filter(debate => !debate.proUser || !debate.conUser)
      .map(debate => ({
        debateId: debate.id,
        topic: debate.topic,
        proUser: debate.proUser?.username || '❌ Pro player did not join',
        conUser: debate.conUser?.username || '❌ Con player did not join',
        createdAt: debate.createdAt,
      }));

    return NextResponse.json({
      leaderboard: formatted,
      incompleteDebates: missingParticipantsInfo,
      range,
      summary: {
        totalPlayers: formatted.length,
        incompleteDebatesCount: missingParticipantsInfo.length,
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}