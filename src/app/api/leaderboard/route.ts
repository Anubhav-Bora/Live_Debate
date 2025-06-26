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
          },
        },
        UserBadge: {
          where: {
            earnedAt: {
              gte: dateFilter,
            },
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

    // Step 2: Calculate average score per user
    const formatted = users
      .map((user) => {
        const scoreCount = user.scores.length;
        const totalAverage =
          user.scores.reduce((acc, score) => {
            const avgScore = (score.logic + score.clarity + score.persuasiveness) / 3;
            return acc + avgScore;
          }, 0) / (scoreCount || 1);

        return {
          id: user.id,
          username: user.username,
          totalScore: Number(totalAverage.toFixed(2)),
          debateCount: user._count.debatesPro + user._count.debatesCon,
          badges: user.UserBadge.length,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore); // Step 3: Sort in JS

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
