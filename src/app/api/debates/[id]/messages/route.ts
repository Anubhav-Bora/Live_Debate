import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { ensureUserExists } from "@/lib/userSync";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const messages = await prisma.message.findMany({
      where: { debateId: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, content, role } = await request.json();
    
    if (!userId || !content || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure user exists, create if not found
    let user;
    try {
      user = await ensureUserExists(userId);
    } catch (syncError) {
      console.error("Error syncing user from Clerk:", syncError);
      return NextResponse.json({ error: "Failed to sync user account" }, { status: 500 });
    }

    try {
      const newMessage = await prisma.message.create({
        data: {
          content,
          role,
          debateId: id,
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