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
    console.log('🔍 GET /api/debates - Starting fetch');
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
    console.log(`✅ GET /api/debates - Successfully fetched ${debates.length} debates`);
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
    console.log('🚀 POST /api/debates - Starting debate creation');
    
    // Parse request body
    try {
      requestBody = await req.json() as DebateRequestBody;
      console.log('📥 POST /api/debates - Request body parsed:', { 
        topic: requestBody.topic, 
        duration: requestBody.duration, 
        isPublic: requestBody.isPublic,
        proDisplayName: requestBody.proDisplayName 
      });
    } catch (parseError) {
      console.error('❌ POST /api/debates - Failed to parse request body:', parseError);
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    if (!requestBody) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const body: DebateRequestBody = requestBody;
    topic = body.topic;
    const { duration, isPublic, proDisplayName } = body;
    
    // Check authentication
    console.log('🔐 POST /api/debates - Checking authentication');
    let authSession;
    try {
      authSession = await auth();
      userId = authSession.userId || undefined;
      console.log('🔐 POST /api/debates - Auth result:', { 
        hasUserId: !!userId, 
        userIdLength: userId?.length || 0,
        isSignedIn: !!authSession.userId 
      });
    } catch (authError) {
      console.error('❌ POST /api/debates - Authentication error:', authError);
      return NextResponse.json({ 
        error: "Authentication failed. Please sign in again.", 
        details: "Unable to verify your identity" 
      }, { status: 500 });
    }

    if (!userId) {
      console.log('❌ POST /api/debates - No user ID found in auth session');
      return NextResponse.json({ 
        error: "Authentication required. Please sign in to create a debate.", 
        details: "No valid user session found" 
      }, { status: 401 });
    }

    // Validate topic
    if (!topic || typeof topic !== 'string' || topic.trim().length < 1) {
      console.log('❌ POST /api/debates - Invalid topic:', { topic, type: typeof topic });
      return NextResponse.json({ error: "Debate topic is required." }, { status: 400 });
    }

    // Validate display name
    if (!proDisplayName || typeof proDisplayName !== 'string' || proDisplayName.trim().length < 1) {
      console.log('❌ POST /api/debates - Invalid display name:', { proDisplayName, type: typeof proDisplayName });
      return NextResponse.json({ 
        error: "Display name is required.", 
        details: "Please enter your display name for the debate" 
      }, { status: 400 });
    }

    // Ensure user exists
    console.log('👤 POST /api/debates - Ensuring user exists for userId:', userId);
    let user;
    try {
      user = await ensureUserExists(userId);
      console.log('✅ POST /api/debates - User ensured:', { 
        id: user.id, 
        username: user.username, 
        clerkId: user.clerkId,
        email: user.email
      });
    } catch (syncError) {
      console.error("❌ POST /api/debates - Error syncing user from Clerk:", {
        error: syncError instanceof Error ? syncError.stack || syncError.message : syncError,
        userId,
        errorType: syncError?.constructor?.name || 'Unknown'
      });
      return NextResponse.json({ 
        error: "Failed to sync user account. Please try signing in again.", 
        details: "Unable to verify user account in database" 
      }, { status: 500 });
    }

    // Additional validation - ensure user has valid data
    if (!user || !user.id) {
      console.error('❌ POST /api/debates - User object is invalid:', user);
      return NextResponse.json({ 
        error: "Invalid user account. Please contact support.", 
        details: "User record is incomplete" 
      }, { status: 500 });
    }

    // Build debate data
    const debateData = {
      topic: topic.trim(),
      duration: duration || 180,
      joinCodeCon: generateCode(8),
      isPublic: isPublic !== false,
      creatorId: user.id,
      proUserId: user.id,
      proDisplayName: proDisplayName.trim()
    };
    
    console.log('📝 POST /api/debates - Creating debate with data:', {
      ...debateData,
      creatorDetails: { id: user.id, username: user.username, email: user.email }
    });

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
      console.log('✅ POST /api/debates - Debate created successfully:', { 
        id: newDebate.id, 
        topic: newDebate.topic,
        joinCodeCon: newDebate.joinCodeCon,
        creatorId: newDebate.creatorId,
        proUserId: newDebate.proUserId
      });
    } catch (dbError) {
      console.error('❌ POST /api/debates - Database error creating debate:', {
        error: dbError instanceof Error ? dbError.stack || dbError.message : dbError,
        errorType: dbError?.constructor?.name || 'Unknown',
        debateData,
        userInfo: { id: user.id, clerkId: user.clerkId },
        timestamp: new Date().toISOString()
      });
      
      // Check if it's a foreign key constraint error
      if (dbError instanceof Error && dbError.message.includes('foreign key')) {
        return NextResponse.json({ 
          error: "User account error. Please sign out and sign in again.", 
          details: "Database relationship error" 
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: "Database error creating debate. Please try again.", 
        details: "Failed to save debate to database" 
      }, { status: 500 });
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

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}