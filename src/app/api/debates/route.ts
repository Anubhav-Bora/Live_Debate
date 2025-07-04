import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
    const body = await req.json();
    topic = body.topic;
    const { duration, isPublic } = body;
    const authSession = await auth();
    userId = authSession.userId || undefined;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Input validation
    if (!topic || typeof topic !== 'string' || topic.trim().length < 5 || topic.trim().length > 100) {
      return NextResponse.json({ error: "Debate topic must be between 5 and 100 characters." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ 
      where: { clerkId: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for duplicate debates by the same user with the same topic in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const duplicate = await prisma.debate.findFirst({
      where: {
        topic: topic.trim(),
        creatorId: user.id,
        createdAt: { gte: tenMinutesAgo }
      }
    });
    if (duplicate) {
      return NextResponse.json({ error: "You have already created a debate with this topic recently. Please wait before creating another." }, { status: 400 });
    }

    const newDebate = await prisma.debate.create({
      data: {
        topic: topic.trim(),
        duration: duration || 180,
        joinCodeCon: generateCode(8),
        isPublic: isPublic !== false,
        creatorId: user.id,
        proUserId: user.id,
      },
      include: {
        proUser: true,
        creator: true
      }
    });

    // Return only debateId and con join code for frontend
    return NextResponse.json({
      id: newDebate.id,
      joinCodeCon: newDebate.joinCodeCon,
      duration: newDebate.duration,
      topic: newDebate.topic
    });
  } catch (error) {
    console.error("Error creating debate:", { error, userId, topic });
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