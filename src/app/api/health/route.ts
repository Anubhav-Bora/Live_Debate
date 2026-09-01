import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      ai: process.env.GEMINI_API_KEY ? "configured" : "unconfigured",
      timestamp: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "error", database: "unavailable", timestamp: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
