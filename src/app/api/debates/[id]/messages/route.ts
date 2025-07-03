import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const messages = await prisma.message.findMany({
      where: { debateId: params.id },
      include: { sender: true },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, content, role } = await request.json();
    
    if (!userId || !content || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Look up the user by clerkId
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    try {
      const newMessage = await prisma.message.create({
        data: {
          content,
          role,
          debateId: params.id,
          senderId: user.id, // Use the internal CUID
        },
        include: { sender: true }
      });

      return NextResponse.json(newMessage);
    } catch (dbError) {
      console.error('DB error creating message:', dbError);
      return NextResponse.json(
        { error: 'Failed to create message', details: dbError instanceof Error ? dbError.message : dbError },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message', details: error instanceof Error ? error.message : error },
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