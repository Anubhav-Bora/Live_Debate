import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: {
        proUser: true,
        conUser: true,
        judge: true,
        creator: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true }
        }
      }
    });

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    return NextResponse.json(debate);
  } catch (error) {
    console.error("Error fetching debate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, action, joinCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
      where: { clerkId: userId } 
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: params.id }
    });

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    let updatedDebate;

    if (action === "join_con") {
      if (!joinCode || joinCode !== debate.joinCodeCon) {
        return NextResponse.json(
          { error: "Invalid join code for Con position" },
          { status: 400 }
        );
      }
      
      if (debate.conUserId) {
        return NextResponse.json(
          { error: "Con position already taken" },
          { status: 400 }
        );
      }
      
      updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { 
          conUserId: user.id,
          status: debate.proUserId && debate.judgeId ? "in-progress" : "waiting"
        },
        include: {
          proUser: true,
          conUser: true,
          judge: true,
          creator: true
        }
      });
    } else if (action === "join_judge") {
      if (!joinCode || joinCode !== debate.joinCodeJudge) {
        return NextResponse.json(
          { error: "Invalid join code for Judge position" },
          { status: 400 }
        );
      }
      
      if (debate.judgeId) {
        return NextResponse.json(
          { error: "Judge position already taken" },
          { status: 400 }
        );
      }
      
      updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { 
          judgeId: user.id,
          status: debate.proUserId && debate.conUserId ? "in-progress" : "waiting"
        },
        include: {
          proUser: true,
          conUser: true,
          judge: true,
          creator: true
        }
      });
    } else if (action === "end") {
      updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { status: "completed" },
        include: {
          proUser: true,
          conUser: true,
          judge: true,
          creator: true
        }
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(updatedDebate);
  } catch (error) {
    console.error("Error updating debate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}