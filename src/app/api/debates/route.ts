import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUserExists } from "@/lib/userSync";

function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

interface DebateRequestBody {
  topic: string;
  duration?: number;
  isPublic?: boolean;
  proDisplayName?: string;
}

export async function GET() {
  try {
    const debates = await prisma.debate.findMany({
      include: {
        proUser: {
          select: {
            id: true,
            username: true,
            clerkId: true
          }
        },
        conUser: {
          select: {
            id: true,
            username: true,
            clerkId: true
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(debates);
  } catch (error) {
    console.error("Error fetching debates:", error);
    return NextResponse.json(
      { error: "Failed to fetch debates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let userId: string | undefined;
  let topic: string | undefined;
  
  try {
    const body: DebateRequestBody = await req.json();
    topic = body.topic;
    const { duration, isPublic, proDisplayName } = body;
    const authSession = await auth();
    userId = authSession.userId || undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!topic || typeof topic !== 'string' || topic.trim().length < 1) {
      return NextResponse.json({ error: "Debate topic is required." }, { status: 400 });
    }

    // Ensure user exists, create if not found
    let user;
    try {
      user = await ensureUserExists(userId);
    } catch (syncError) {
      console.error("Error syncing user from Clerk:", syncError);
      return NextResponse.json({ error: "Failed to sync user account" }, { status: 500 });
    }

    // Build the complete debate data object with all fields
    const debateData = {
      topic: topic.trim(),
      duration: duration || 180,
      joinCodeCon: generateCode(8),
      isPublic: isPublic !== false,
      creatorId: user.id,
      proUserId: user.id,
      proDisplayName: proDisplayName?.trim() || null, // Always include this field
    };

    const newDebate = await prisma.debate.create({
      data: debateData,
      include: {
        proUser: true,
        creator: true
      }
    });

    return NextResponse.json({
      id: newDebate.id,
      joinCodeCon: newDebate.joinCodeCon,
      duration: newDebate.duration,
      topic: newDebate.topic
    });
  } catch (error) {
    console.error("Error creating debate:", {
      error: error instanceof Error ? error.stack || error.message : error,
      userId,
      topic,
    });
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