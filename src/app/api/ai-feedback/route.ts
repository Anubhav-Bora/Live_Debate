import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Use the debate result endpoint so analysis is authenticated and saved atomically." },
    { status: 410 },
  );
}
