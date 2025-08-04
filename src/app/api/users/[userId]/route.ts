import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  
  try {
    // Get user with scores and counts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        scores: {
          include: { debate: { select: { id: true, topic: true } } },
          orderBy: { createdAt: "desc" },
          take: 5
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

    // Get user badges separately
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" }
    });

    const totalScore = user.scores.reduce((acc, score) => 
      acc + (score.logic + score.clarity + score.persuasiveness + score.tone) / 4, 0);

    return NextResponse.json({
      ...user,
      userBadges,
      totalScore,
      debateCount: user._count.debatesPro + user._count.debatesCon + user._count.debatesCreated
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}