import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!allowRequest(`vote:${user.id}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const body = (await request.json()) as { debateId?: unknown; winner?: unknown };
    const debateId = typeof body.debateId === "string" ? body.debateId : "";
    if (!debateId || (body.winner !== "pro" && body.winner !== "con")) {
      return NextResponse.json({ error: "A valid debate and winner are required." }, { status: 400 });
    }
    const debate = await prisma.debate.findUnique({ where: { id: debateId }, select: { status: true } });
    if (!debate) return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    if (debate.status !== "completed") {
      return NextResponse.json({ error: "Voting opens after the debate ends." }, { status: 409 });
    }
    await prisma.vote.create({ data: { userId: user.id, debateId, winner: body.winner } });
    const [proVotes, conVotes] = await prisma.$transaction([
      prisma.vote.count({ where: { debateId, winner: "pro" } }),
      prisma.vote.count({ where: { debateId, winner: "con" } }),
    ]);
    return NextResponse.json({ proVotes, conVotes });
  } catch (error) {
    const known = error as { code?: string };
    if (known.code === "P2002") {
      return NextResponse.json({ error: "You have already voted on this debate." }, { status: 409 });
    }
    console.error("Could not submit vote:", error);
    return NextResponse.json({ error: "Could not submit vote" }, { status: 500 });
  }
}
