import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserExists } from "@/lib/userSync";

export async function GET() {
  try {
    console.log('🔍 DEBUG /api/debug/user - Starting user debug check');
    
    // Check authentication
    const authSession = await auth();
    const clerkUserId = authSession?.userId;
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      auth: {
        isAuthenticated: !!clerkUserId,
        clerkUserId: clerkUserId || null,
        hasSession: !!authSession
      },
      database: {
        connected: false,
        userExists: false,
        userDetails: null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasClerkSecret: !!process.env.CLERK_SECRET_KEY
      }
    };

    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      debugInfo.database.connected = true;
      console.log('✅ DEBUG /api/debug/user - Database connection successful');
    } catch (dbError) {
      console.error('❌ DEBUG /api/debug/user - Database connection failed:', dbError);
      debugInfo.database.connected = false;
    }

    // If user is authenticated, check user record
    if (clerkUserId) {
      try {
        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { clerkId: clerkUserId }
        });

        if (existingUser) {
          debugInfo.database.userExists = true;
          debugInfo.database.userDetails = {
            id: existingUser.id,
            username: existingUser.username,
            email: existingUser.email,
            clerkId: existingUser.clerkId,
            createdAt: existingUser.createdAt
          };
          console.log('✅ DEBUG /api/debug/user - User found in database');
        } else {
          console.log('⚠️ DEBUG /api/debug/user - User not found in database, testing sync');
          
          // Test user sync
          try {
            const syncedUser = await ensureUserExists(clerkUserId);
            debugInfo.database.userExists = true;
            debugInfo.database.userDetails = {
              id: syncedUser.id,
              username: syncedUser.username,
              email: syncedUser.email,
              clerkId: syncedUser.clerkId,
              createdAt: syncedUser.createdAt,
              syncedNow: true
            };
            console.log('✅ DEBUG /api/debug/user - User synced successfully');
          } catch (syncError) {
            console.error('❌ DEBUG /api/debug/user - User sync failed:', syncError);
            debugInfo.database.userExists = false;
            debugInfo.database.error = syncError instanceof Error ? syncError.message : 'Unknown sync error';
          }
        }
      } catch (userCheckError) {
        console.error('❌ DEBUG /api/debug/user - Error checking user:', userCheckError);
        debugInfo.database.error = userCheckError instanceof Error ? userCheckError.message : 'Unknown user check error';
      }
    }

    console.log('📊 DEBUG /api/debug/user - Debug info:', debugInfo);
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    console.error('❌ DEBUG /api/debug/user - Unexpected error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}