import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
