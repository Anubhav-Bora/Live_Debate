import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

interface MessagePostData {
  userId: string;
  content: string;
  role: 'PRO' | 'CON' | 'MODERATOR' | 'SYSTEM';
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET handler - Fetch all messages for a debate
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    
    const messages = await prisma.message.findMany({
      where: { debateId: id },
      include: {
        sender: {
          select: {
            id: true,
            clerkId: true,
            username: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(messages, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch messages', 
        details: error instanceof Error ? error.message : String(error) 
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// POST handler - Create a new message
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { userId, content, role } = body as MessagePostData;
        
    if (!userId || !content || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        clerkId: true,
        username: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          }
        }
      );
    }

    const newMessage = await prisma.message.create({
      data: {
        content,
        role,
        debateId: id,
        senderId: user.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            clerkId: true,
            username: true
          }
        }
      }
    });

    return NextResponse.json(newMessage, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create message', 
        details: error instanceof Error ? error.message : String(error) 
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// OPTIONS handler - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}