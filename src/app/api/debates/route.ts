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
    console.error("❌ GET /api/debates - Error fetching debates:", {
      error: error instanceof Error ? error.stack || error.message : error,
      errorType: error?.constructor?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: "Failed to fetch debates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let userId: string | undefined;
  let topic: string | undefined;
  let requestBody: DebateRequestBody;
  
  try {
    // Parse request body
    try {
      requestBody = await req.json() as DebateRequestBody;
    } catch (parseError) {
      console.error('❌ POST /api/debates - Failed to parse request body:', parseError);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!requestBody) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const body: DebateRequestBody = requestBody;
    topic = body.topic;
    const { duration, isPublic } = body;
    
    // Check authentication
    let authSession;
    try {
      authSession = await auth();
      userId = authSession.userId || undefined;
    } catch (authError) {
      console.error('❌ POST /api/debates - Authentication error:', authError);
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate topic
    if (!topic || typeof topic !== 'string' || topic.trim().length < 1) {
      return NextResponse.json({ error: "Debate topic is required." }, { status: 400 });
    }

    // Ensure user exists
    let user;
    try {
      user = await ensureUserExists(userId);
    } catch (syncError) {
      console.error("❌ POST /api/debates - Error syncing user from Clerk:", {
        error: syncError instanceof Error ? syncError.stack || syncError.message : syncError,
        userId,
        errorType: syncError?.constructor?.name || 'Unknown'
      });
      return NextResponse.json({ error: "Failed to sync user account" }, { status: 500 });
    }

    // Build debate data
    const debateData = {
      topic: topic.trim(),
      duration: duration || 180,
      joinCodeCon: generateCode(8),
      isPublic: isPublic !== false,
      creatorId: user.id,
      proUserId: user.id,
      proDisplayName: user.email
    };

    // Create debate
    let newDebate;
    try {
      newDebate = await prisma.debate.create({
        data: debateData,
        include: {
          proUser: true,
          creator: true
        }
      });
    } catch (dbError) {
      console.error('❌ POST /api/debates - Database error creating debate:', {
        error: dbError instanceof Error ? dbError.stack || dbError.message : dbError,
        errorType: dbError?.constructor?.name || 'Unknown',
        debateData,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json({ error: "Database error creating debate" }, { status: 500 });
    }

    const response = {
      id: newDebate.id,
      joinCodeCon: newDebate.joinCodeCon,
      duration: newDebate.duration,
      topic: newDebate.topic
    };
    
    console.log('🎉 POST /api/debates - Debate creation completed successfully:', response);
    return NextResponse.json(response);
    
  } catch (error) {
    console.error("❌ POST /api/debates - Unexpected error creating debate:", {
      error: error instanceof Error ? error.stack || error.message : error,
      errorType: error?.constructor?.name || 'Unknown',
      userId,
      topic,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
      clerkSecretKey: process.env.CLERK_SECRET_KEY ? 'SET' : 'NOT_SET'
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}