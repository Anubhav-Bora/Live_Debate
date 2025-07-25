import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

interface ScoreData {
  logic: number;
  clarity: number;
  persuasiveness: number;
  tone: number;
}

interface AIScores {
  pro?: ScoreData;
  con?: ScoreData;
}

export async function GET(_: Request, { params }: Params) {
  try {
    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: {
        proUser: true,
        conUser: true,
        creator: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true },
        },
      },
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

export async function POST(request: Request, { params }: Params) {
  try {
    const { userId, action, joinCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({ where: { id: params.id } });
    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    if (action === "join_con") {
      if (debate.status !== "waiting") {
        return NextResponse.json(
          { error: "Debate not open for joining" },
          { status: 400 }
        );
      }
      if ([debate.proUserId, debate.conUserId].includes(user.id)) {
        return NextResponse.json(
          { error: "Already a participant" },
          { status: 400 }
        );
      }
      if (!joinCode || joinCode !== debate.joinCodeCon) {
        return NextResponse.json(
          { error: "Invalid join code" },
          { status: 400 }
        );
      }
      if (debate.conUserId) {
        return NextResponse.json(
          { error: "Con position already taken" },
          { status: 400 }
        );
      }

      const updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: {
          conUserId: user.id,
          status: debate.proUserId ? "in-progress" : "waiting",
        },
        include: { proUser: true, conUser: true, creator: true },
      });

      return NextResponse.json(updatedDebate);
    }

    if (action === "end") {
      const allowedUserIds = [debate.proUserId, debate.conUserId, debate.creatorId];
      if (!allowedUserIds.includes(user.id)) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      const messageCount = await prisma.message.count({
        where: { debateId: debate.id },
      });
      if (messageCount < 4) {
        return NextResponse.json(
          { error: "At least 4 messages required" },
          { status: 400 }
        );
      }

      const updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { status: "completed" },
        include: {
          proUser: true,
          conUser: true,
          creator: true,
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: true },
          },
        },
      });

      if (updatedDebate.proUser && updatedDebate.conUser) {
        const existingScores = await prisma.score.findMany({
          where: {
            debateId: updatedDebate.id,
            userId: { in: [updatedDebate.proUser.id, updatedDebate.conUser.id] },
          },
        });
        const scoredUserIds = existingScores.map((s) => s.userId);

        const transcript = updatedDebate.messages
          .map((m) => `${m.sender.username} (${m.role}): ${m.content}`)
          .join("\n");

        const prompt = `Analyze this debate... \nTranscript:\n${transcript}`;
        let aiScores: AIScores | null = null;

        try {
          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "openai/gpt-4",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 1500,
              }),
            }
          );

          const data = await response.json();
          const analysis = data.choices?.[0]?.message?.content || "";

          let allScores: number[] = [];
          if (typeof analysis === "string") {
            const matches = Array.from(analysis.matchAll(/(\d{1,2})/g));
            allScores = matches.map((m) => parseInt(m[1]));
          }

          aiScores = {
            pro: allScores.length >= 4
              ? {
                  logic: allScores[0],
                  clarity: allScores[1],
                  persuasiveness: allScores[2],
                  tone: allScores[3],
                }
              : undefined,
            con: allScores.length >= 8
              ? {
                  logic: allScores[4],
                  clarity: allScores[5],
                  persuasiveness: allScores[6],
                  tone: allScores[7],
                }
              : undefined,
          };
        } catch {
          aiScores = null;
        }

        const proScore = aiScores?.pro || {
          logic: 7,
          clarity: 8,
          persuasiveness: 7,
          tone: 8,
        };
        const conScore = aiScores?.con || {
          logic: 7,
          clarity: 8,
          persuasiveness: 7,
          tone: 8,
        };

        if (!scoredUserIds.includes(updatedDebate.proUser.id)) {
          await prisma.score.create({
            data: {
              ...proScore,
              userId: updatedDebate.proUser.id,
              debateId: updatedDebate.id,
            },
          });
        }
        if (!scoredUserIds.includes(updatedDebate.conUser.id)) {
          await prisma.score.create({
            data: {
              ...conScore,
              userId: updatedDebate.conUser.id,
              debateId: updatedDebate.id,
            },
          });
        }
      }

      return NextResponse.json(updatedDebate);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: { proUser: true, conUser: true, creator: true },
    });

    if (!debate || debate.proUserId !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete" },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { debateId: params.id } }),
      prisma.score.deleteMany({ where: { debateId: params.id } }),
      prisma.vote.deleteMany({ where: { debateId: params.id } }),
      prisma.debate.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: { proUser: true, conUser: true, creator: true },
    });

    if (!debate || debate.proUserId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "remove_con" && debate.conUser) {
      const updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { conUserId: null, status: "waiting" },
        include: { proUser: true, conUser: true, creator: true },
      });
      return NextResponse.json(updatedDebate);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}