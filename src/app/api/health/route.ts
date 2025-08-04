import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    status: "ok",
    checks: {
      database: {
        connected: false,
        error: null as string | null
      },
      environment_variables: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
        CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      }
    }
  };

  // Test database connection
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database.connected = true;
    console.log('✅ Health check - Database connection successful');
  } catch (error) {
    checks.checks.database.connected = false;
    checks.checks.database.error = error instanceof Error ? error.message : 'Unknown database error';
    checks.status = "error";
    console.error('❌ Health check - Database connection failed:', error);
  }

  // Overall status
  if (!checks.checks.database.connected || 
      !checks.checks.environment_variables.DATABASE_URL ||
      !checks.checks.environment_variables.CLERK_SECRET_KEY) {
    checks.status = "error";
  }

  console.log('🏥 Health check results:', checks);

  return NextResponse.json(checks, {
    status: checks.status === "ok" ? 200 : 500
  });
}