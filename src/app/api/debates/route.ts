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

    // Try to find the user first
    let user = await prisma.user.findUnique({
       where: { clerkId: userId }
    });

    // If user doesn't exist, sync them from Clerk
    if (!user) {
      try {
        // Fetch user details from Clerk
        const clerkRes = await fetch(
          `https://api.clerk.com/v1/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
            },
          }
        );

        if (!clerkRes.ok) {
          console.error("Failed to fetch user from Clerk");
          return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
        }

        const clerkUser = await clerkRes.json();

        if (!clerkUser.email_addresses?.[0]?.email_address) {
          console.error("No email address found for user");
          return NextResponse.json({ error: "No email address found" }, { status: 400 });
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            clerkId: userId,
            username:
              clerkUser.username ||
              clerkUser.email_addresses[0].email_address.split("@")[0],
            email: clerkUser.email_addresses[0].email_address,
          },
        });

        console.log(`✅ User synced successfully: ${user.username}`);
      } catch (syncError) {
        console.error("Error syncing user:", syncError);
        return NextResponse.json({ error: "Failed to sync user" }, { status: 500 });
      }
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