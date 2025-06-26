import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuth } from "@clerk/nextjs/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { debateId, winner } = await req.json();
    if (!debateId || !winner) {
      return NextResponse.json(
        { error: "Debate ID and winner are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already voted
    const existingVote = await prisma.vote.findFirst({
      where: { userId: user.id, debateId },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted on this debate" },
        { status: 400 }
      );
    }

    // Create new vote
    await prisma.vote.create({
      data: {
        userId: user.id,
        debateId,
        winner,
      },
    });

    // Get updated vote counts
    const proVotes = await prisma.vote.count({
      where: { debateId, winner: "pro" },
    });
    const conVotes = await prisma.vote.count({
      where: { debateId, winner: "con" },
    });

    return NextResponse.json({ proVotes, conVotes });
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}