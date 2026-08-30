import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Direct transcript analysis is disabled. Complete a debate to generate a persisted result." },
    { status: 410 },
  );
}
