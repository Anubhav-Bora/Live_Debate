import { NextResponse } from "next/server";
import { createSession, requestFingerprint, setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rateKey = `signin:${requestFingerprint(request)}:${email.slice(0, 100)}`;

    if (!allowRequest(rateKey, 8, 10 * 60_000)) {
      return NextResponse.json({ error: "Too many sign-in attempts. Please wait and try again." }, { status: 429 });
    }
    if (!email || !password || password.length > 128) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, createdAt: true, passwordHash: true },
    });
    if (!(await verifyPassword(password, user?.passwordHash))) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const session = await createSession(user!.id);
    await setSessionCookie(session.token, session.expiresAt);
    return NextResponse.json({
      user: { id: user!.id, username: user!.username, email: user!.email, createdAt: user!.createdAt },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Native sign-in failed:", error);
    return NextResponse.json({ error: "Could not sign in right now." }, { status: 500 });
  }
}
