import { NextResponse , type NextRequest} from "next/server";
import { prisma } from "@/lib/prisma";

// Define types
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
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
)  {
try {
    const { id } = params;

    const debate = await prisma.debate.findUnique({
      where: { id },
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

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const { userId, action, joinCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({ where: { id } });

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
        where: { id },
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
        where: { id },
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

        const prompt = `Analyze this debate transcript and score both participants (pro and con) on four criteria: logic, clarity, persuasiveness, and tone.
Provide only the scores as numbers in this exact format:
Pro: [logic], [clarity], [persuasiveness], [tone]
Con: [logic], [clarity], [persuasiveness], [tone]

Debate Topic: ${updatedDebate.topic}
Transcript:\n${transcript}`;

        let aiScores: AIScores | null = null;

        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "openai/gpt-4",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_tokens: 1500,
            }),
          });

          const data = await response.json();
          const analysis = data.choices[0]?.message?.content;

          if (analysis) {
            const proMatch = analysis.match(/Pro:\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);
            const conMatch = analysis.match(/Con:\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/);

            if (proMatch && conMatch) {
              aiScores = {
                pro: {
                  logic: parseInt(proMatch[1]),
                  clarity: parseInt(proMatch[2]),
                  persuasiveness: parseInt(proMatch[3]),
                  tone: parseInt(proMatch[4]),
                },
                con: {
                  logic: parseInt(conMatch[1]),
                  clarity: parseInt(conMatch[2]),
                  persuasiveness: parseInt(conMatch[3]),
                  tone: parseInt(conMatch[4]),
                }
              };
            }
          }
        } catch (error) {
          console.error("OpenRouter API error:", error);
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

export async function DELETE(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id },
      include: { proUser: true, conUser: true, creator: true },
    });

    if (!debate || debate.proUserId !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to delete" },
        { status: 403 }
      );
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { debateId: id } }),
      prisma.score.deleteMany({ where: { debateId: id } }),
      prisma.vote.deleteMany({ where: { debateId: id } }),
      prisma.debate.delete({ where: { id } }),
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

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const debate = await prisma.debate.findUnique({
      where: { id },
      include: { proUser: true, conUser: true, creator: true },
    });

    if (!debate || debate.proUserId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "remove_con" && debate.conUser) {
      const updatedDebate = await prisma.debate.update({
        where: { id },
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
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
