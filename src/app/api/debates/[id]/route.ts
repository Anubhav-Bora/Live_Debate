import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserExists } from "@/lib/userSync";

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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, action, joinCode } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists, create if not found
    let user;
    try {
      user = await ensureUserExists(userId);
    } catch (syncError) {
      console.error("Error syncing user from Clerk:", syncError);
      return NextResponse.json({ error: "Failed to sync user account" }, { status: 500 });
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

      if (!joinCode || joinCode.trim().toUpperCase() !== debate.joinCodeCon) {
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

      // If not enough messages, mark as not happened
      if (messageCount < 4) {
        const updatedDebate = await prisma.debate.update({
          where: { id },
          data: {
            status: "completed",
            aiFeedback: { message: "Debate did not happen due to insufficient participation." },
          },
          include: { proUser: true, conUser: true, creator: true },
        });
        return NextResponse.json({
          ...updatedDebate,
          aiFeedback: updatedDebate.aiFeedback,
        });
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

        const prompt = `Analyze this debate transcript and score both participants (pro and con) on four criteria: logic, clarity, persuasiveness, and tone.\nProvide only the scores as numbers in this exact format:\nPro: [logic], [clarity], [persuasiveness], [tone]\nCon: [logic], [clarity], [persuasiveness], [tone]\n\nDebate Topic: ${updatedDebate.topic}\nTranscript:\n${transcript}`;

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

        // Call feedback API and store in aiFeedback
        let aiFeedback = null;
        try {
          const feedbackRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript, debateTopic: updatedDebate.topic }),
          });
          const feedbackData = await feedbackRes.json();
          aiFeedback = feedbackData.analysis || null;
        } catch (err) {
          console.error("AI feedback error:", err);
        }

        const debateWithFeedback = await prisma.debate.update({
          where: { id: updatedDebate.id },
          data: { aiFeedback },
          include: { proUser: true, conUser: true, creator: true },
        });

        return NextResponse.json({
          ...debateWithFeedback,
          aiFeedback: debateWithFeedback.aiFeedback,
        });
      }

      // If for some reason proUser or conUser is missing
      const debateWithAbsent = await prisma.debate.update({
        where: { id },
        data: {
          aiFeedback: { message: "Debate did not happen due to missing participant." },
        },
        include: { proUser: true, conUser: true, creator: true },
      });
      return NextResponse.json({
        ...debateWithAbsent,
        aiFeedback: debateWithAbsent.aiFeedback,
      });
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists, create if not found
    let user;
    try {
      user = await ensureUserExists(userId);
    } catch (syncError) {
      console.error("Error syncing user from Clerk:", syncError);
      return NextResponse.json({ error: "Failed to sync user account" }, { status: 500 });
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, action } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists, create if not found
    let user;
    try {
      user = await ensureUserExists(userId);
    } catch (syncError) {
      console.error("Error syncing user from Clerk:", syncError);
      return NextResponse.json({ error: "Failed to sync user account" }, { status: 500 });
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