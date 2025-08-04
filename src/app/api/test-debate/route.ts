import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST() {
  try {
    console.log('🧪 Test debate creation - Starting');

    // Create a test user first
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        clerkId: 'test_clerk_id_' + Date.now(),
        username: 'testuser_' + Date.now(),
        email: 'test@example.com',
      }
    });

    console.log('✅ Test user created/found:', testUser.id);

    // Create a test debate
    const debateData = {
      topic: 'Test Debate Topic - ' + new Date().toISOString(),
      duration: 180,
      joinCodeCon: generateCode(8),
      isPublic: true,
      creatorId: testUser.id,
      proUserId: testUser.id,
      proDisplayName: 'Test Pro User',
    };

    console.log('📝 Creating test debate with data:', debateData);

    const newDebate = await prisma.debate.create({
      data: debateData,
      include: {
        proUser: true,
        creator: true
      }
    });

    console.log('✅ Test debate created successfully:', newDebate.id);

    // Clean up test data
    await prisma.debate.delete({
      where: { id: newDebate.id }
    });

    await prisma.user.delete({
      where: { id: testUser.id }
    });

    console.log('🧹 Test data cleaned up');

    return NextResponse.json({
      success: true,
      message: 'Test debate creation completed successfully',
      testResults: {
        userCreated: true,
        debateCreated: true,
        dataCleanedUp: true
      }
    });

  } catch (error) {
    console.error('❌ Test debate creation failed:', {
      error: error instanceof Error ? error.stack || error.message : error,
      errorType: error?.constructor?.name || 'Unknown',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown'
    }, { status: 500 });
  }
}