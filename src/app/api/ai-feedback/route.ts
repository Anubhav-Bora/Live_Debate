import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { debateId, userId, role, message } = await req.json();
    
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

    // Get debate context
    const debate = await prisma.debate.findUnique({
      where: { id: debateId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20 // Get last 20 messages for context
        }
      }
    });

    if (!debate) {
      return NextResponse.json({ error: "Debate not found" }, { status: 404 });
    }

    // Prepare messages for AI
    const messages = debate.messages.map(msg => ({
      role: msg.role === "judge" ? "assistant" : msg.role,
      content: msg.content
    }));

    // Add system prompt
    const systemPrompt = `You are a debate coach analyzing a live debate on "${debate.topic}". 
    Provide constructive feedback on the arguments, suggest improvements, and score the performance 
    (1-10) on logic, clarity, persuasiveness, and tone. Be specific and helpful.`;

    messages.unshift({
      role: "system",
      content: systemPrompt
    });

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://yourdomain.com",
        "X-Title": "DebateArena"
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku", // Free model
        messages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.statusText}`);
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    // Parse scores from feedback (assuming format like "Logic: 8/10")
    const scoreRegex = /(\w+):\s*(\d+)\/10/g;
    const scores: Record<string, number> = {};
    let match;
    while ((match = scoreRegex.exec(feedback)) !== null) {
      scores[match[1].toLowerCase()] = parseInt(match[2]);
    }

    // Save feedback and scores
    if (userId && Object.keys(scores).length > 0) {
      await prisma.score.create({
        data: {
          logic: scores.logic || 5,
          clarity: scores.clarity || 5,
          persuasiveness: scores.persuasiveness || 5,
          tone: scores.tone || 5,
          userId: userId,
          debateId: debateId
        }
      });
    }

    return NextResponse.json({
      feedback,
      scores
    });

  } catch (error) {
    console.error("AI feedback error:", error);
    return NextResponse.json(
      { error: "Failed to generate AI feedback" },
      { status: 500 }
    );
  }
}