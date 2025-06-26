import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    include: {
      scores: {
        include: { debate: { select: { id: true, topic: true } } },
        orderBy: { createdAt: "desc" },
        take: 5
      },
      UserBadge: {
        include: { badge: true },
        orderBy: { earnedAt: "desc" }
      },
      _count: {
        select: { 
          debatesPro: true,
          debatesCon: true,
          debatesCreated: true
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const totalScore = user.scores.reduce((acc, score) => 
    acc + (score.logic + score.clarity + score.persuasiveness + score.tone) / 4, 0);

  return NextResponse.json({
    ...user,
    totalScore,
    debateCount: user._count.debatesPro + user._count.debatesCon + user._count.debatesCreated
  });
}