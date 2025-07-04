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
          status: debate.proUserId ? "in-progress" : "waiting"
        },
        include: {
          proUser: true,
          conUser: true,
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
        // Build transcript for AI
        const transcript = updatedDebate.messages
          .map((msg: any) => `${msg.sender.username} (${msg.role}): ${msg.content}`)
          .join("\n");
        const debateTopic = updatedDebate.topic;
        let aiScores: any = null;
        try {
          const prompt = `\n    Analyze this debate transcript and provide detailed feedback on both participants' performance.\n    \n    Debate Topic: ${debateTopic}\n    \n    Transcript:\n    ${transcript}\n    \n    Provide feedback in the following format for each participant:\n    1. Argument Structure (1-10): Score and detailed analysis\n    2. Logical Consistency (1-10): Score and detailed analysis\n    3. Persuasiveness (1-10): Score and detailed analysis\n    4. Tone and Delivery (1-10): Score and detailed analysis\n    5. Overall Effectiveness (1-10): Score and summary\n    \n    Also provide 3 specific suggestions for improvement for each participant.\n    `;
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
          const data = await response.json();
          const analysis = data.choices?.[0]?.message?.content;
          // Parse scores for pro and con from analysis (simple regex-based extraction)
          if (analysis) {
            aiScores = { pro: {}, con: {} };
            // Try to extract scores for each participant
            const proMatch = analysis.match(/pro.*?(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/i);
            const conMatch = analysis.match(/con.*?(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/i);
            // Fallback: try to extract all numbers in order
            const allScores = Array.from(analysis.matchAll(/(\d{1,2})/g)).map(m => parseInt(m[1]));
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
        } catch (err) {
          // Fallback to static scores if AI fails
          aiScores = null;
        }
        // Save scores for pro and con
        const proScore = aiScores?.pro || { logic: 7, clarity: 8, persuasiveness: 7, tone: 8 };
        const conScore = aiScores?.con || { logic: 7, clarity: 8, persuasiveness: 7, tone: 8 };
        if (!scoredUserIds.includes(updatedDebate.proUser.id)) {
          await prisma.score.create({
            data: {
              ...proScore,
              userId: updatedDebate.proUser.id,
              debateId: updatedDebate.id
            }
          });
        }
        if (!scoredUserIds.includes(updatedDebate.conUser.id)) {
          await prisma.score.create({
            data: {
              ...conScore,
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