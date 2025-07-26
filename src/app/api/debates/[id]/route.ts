import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Type definitions
interface Message {
  sender: { username: string };
  role: string;
  content: string;
}

interface Score {
  logic: number;
  clarity: number;
  persuasiveness: number;
  tone: number;
}

interface AIScores {
  pro: Score;
  con: Score;
}

interface DebateRequestBody {
  userId?: string;
  action?: string;
  joinCode?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
}

const DEFAULT_SCORES: Score = {
  logic: 7,
  clarity: 8,
  persuasiveness: 7,
  tone: 8
};

// GET Handler - Properly typed for Next.js App Router
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    if (!params?.id) {
      return NextResponse.json(
        { error: "Debate ID is required" },
        { status: 400 }
      );
    }

    const debate = await prisma.debate.findUnique({
      where: { id: params.id },
      include: {
        proUser: true,
        conUser: true,
        creator: true,
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: true }
        }
      }
    });

    if (!debate) {
      return NextResponse.json(
        { error: "Debate not found" },
        { status: 404 }
      );
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

// POST Handler
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  let userId: string | undefined;
  let action: string | undefined;
  
  try {
    const body: DebateRequestBody = await request.json();
    userId = body.userId;
    action = body.action;
    const { joinCode } = body;

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
      if (debate.status !== "waiting") {
        return NextResponse.json(
          { error: "Cannot join: Debate is not open for joining." },
          { status: 400 }
        );
      }
      if (debate.proUserId === user.id || debate.conUserId === user.id) {
        return NextResponse.json(
          { error: "You are already a participant in this debate." },
          { status: 400 }
        );
      }
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
          status: debate.proUserId ? "in-progress" : "waiting"
        },
        include: {
          proUser: true,
          conUser: true,
          creator: true
        }
      });
    } else if (action === "end") {
      if (debate.status === "completed") {
        return NextResponse.json({ error: "Debate is already completed." }, { status: 400 });
      }
      const allowedUserIds = [debate.proUserId, debate.conUserId, debate.creatorId];
      if (!allowedUserIds.includes(user.id)) {
        return NextResponse.json({ error: "You are not authorized to end this debate." }, { status: 403 });
      }
      const messageCount = await prisma.message.count({ where: { debateId: debate.id } });
      if (messageCount < 4) {
        return NextResponse.json({ error: "Debate must have at least 4 messages before it can be ended and scored." }, { status: 400 });
      }
      updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { status: "completed" },
        include: {
          proUser: true,
          conUser: true,
          creator: true,
          messages: {
            orderBy: { createdAt: "asc" },
            include: { sender: true }
          }
        }
      });
      if (updatedDebate.proUser && updatedDebate.conUser) {
        const existingScores = await prisma.score.findMany({
          where: {
            debateId: updatedDebate.id,
            userId: { in: [updatedDebate.proUser.id, updatedDebate.conUser.id] }
          }
        });
        const scoredUserIds = existingScores.map(s => s.userId);
        const transcript = updatedDebate.messages
          .map((msg: Message) => `${msg.sender.username} (${msg.role}): ${msg.content}`)
          .join("\n");
        const debateTopic = updatedDebate.topic;
        
        const aiScores: AIScores = {
          pro: { ...DEFAULT_SCORES },
          con: { ...DEFAULT_SCORES }
        };

        try {
          const prompt = `Analyze this debate transcript and provide detailed feedback on both participants' performance.\n\nDebate Topic: ${debateTopic}\n\nTranscript:\n${transcript}\n\nProvide feedback in the following format for each participant:\n1. Argument Structure (1-10): Score and detailed analysis\n2. Logical Consistency (1-10): Score and detailed analysis\n3. Persuasiveness (1-10): Score and detailed analysis\n4. Tone and Delivery (1-10): Score and detailed analysis\n5. Overall Effectiveness (1-10): Score and summary\n\nAlso provide 3 specific suggestions for improvement for each participant.`;
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "openai/gpt-4",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_tokens: 1500
            })
          });
          
          const data: OpenRouterResponse = await response.json();
          const analysis = data.choices?.[0]?.message?.content;
          
          if (analysis) {
            const proMatch = analysis.match(/pro.*?(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/i);
            const conMatch = analysis.match(/con.*?(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/i);
            const allScores = Array.from(analysis.matchAll(/(\d{1,2})/g)).map((m: RegExpMatchArray) => parseInt(m[1]));
            
            if (proMatch && proMatch.length >= 5) {
              aiScores.pro = {
                logic: Number(proMatch[1]),
                clarity: Number(proMatch[2]),
                persuasiveness: Number(proMatch[3]),
                tone: Number(proMatch[4]),
              };
            } else if (allScores.length >= 4) {
              aiScores.pro = {
                logic: allScores[0],
                clarity: allScores[1],
                persuasiveness: allScores[2],
                tone: allScores[3],
              };
            }
            
            if (conMatch && conMatch.length >= 5) {
              aiScores.con = {
                logic: Number(conMatch[1]),
                clarity: Number(conMatch[2]),
                persuasiveness: Number(conMatch[3]),
                tone: Number(conMatch[4]),
              };
            } else if (allScores.length >= 8) {
              aiScores.con = {
                logic: allScores[4],
                clarity: allScores[5],
                persuasiveness: allScores[6],
                tone: allScores[7],
              };
            }
          }
        } catch (error) {
          console.error("Error generating AI scores:", error);
        }
        
        if (!scoredUserIds.includes(updatedDebate.proUser.id)) {
          await prisma.score.create({
            data: {
              ...aiScores.pro,
              userId: updatedDebate.proUser.id,
              debateId: updatedDebate.id
            }
          });
        }
        if (!scoredUserIds.includes(updatedDebate.conUser.id)) {
          await prisma.score.create({
            data: {
              ...aiScores.con,
              userId: updatedDebate.conUser.id,
              debateId: updatedDebate.id
            }
          });
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(updatedDebate);
  } catch (error) {
    console.error("Error updating debate:", { error, userId, debateId: params.id, action });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE Handler
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { userId } = await request.json() as { userId?: string };

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
      where: { id: params.id },
      include: {
        proUser: true,
        conUser: true,
        creator: true
      }
    });

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    if (debate.creatorId !== user.id) {
      return NextResponse.json({ error: "Only the debate creator can delete this debate" }, { status: 403 });
    }

    await prisma.$transaction([
      prisma.message.deleteMany({
        where: { debateId: params.id }
      }),
      prisma.score.deleteMany({
        where: { debateId: params.id }
      }),
      prisma.vote.deleteMany({
        where: { debateId: params.id }
      }),
      prisma.debate.delete({
        where: { id: params.id }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting debate:", { error, debateId: params.id });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH Handler
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  let userId: string | undefined;
  let action: string | undefined;
  
  try {
    const body: DebateRequestBody = await request.json();
    userId = body.userId;
    action = body.action;

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
      where: { id: params.id },
      include: {
        proUser: true,
        conUser: true,
        creator: true
      }
    });

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    if (debate.creatorId !== user.id) {
      return NextResponse.json({ error: "Only the debate creator can remove participants" }, { status: 403 });
    }

    let updatedDebate;

    if (action === "remove_pro") {
      if (!debate.proUser) {
        return NextResponse.json({ error: "No Pro participant to remove" }, { status: 400 });
      }
      return NextResponse.json({ error: "Cannot remove the Pro participant as they are the debate creator" }, { status: 400 });
    } else if (action === "remove_con") {
      if (!debate.conUser) {
        return NextResponse.json({ error: "No Con participant to remove" }, { status: 400 });
      }
      
      updatedDebate = await prisma.debate.update({
        where: { id: params.id },
        data: { 
          conUserId: null,
          status: "waiting"
        },
        include: {
          proUser: true,
          conUser: true,
          creator: true
        }
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(updatedDebate);
  } catch (error) {
    console.error("Error updating debate:", { error, userId, debateId: params.id, action });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// OPTIONS Handler
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}