import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createSession, hashPassword, requestFingerprint, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { allowRequest } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; username?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fingerprint = requestFingerprint(request);

    if (!allowRequest(`signup:${fingerprint}`, 5, 15 * 60_000)) {
      return NextResponse.json({ error: "Too many sign-up attempts. Please try again later." }, { status: 429 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 3–24 characters using letters, numbers, _ or -." }, { status: 400 });
    }
    if (password.length < 10 || password.length > 128 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json({ error: "Password must be 10–128 characters and include a letter and number." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, username: true, email: true, createdAt: true },
    });
    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That email or username is already registered." }, { status: 409 });
    }
    console.error("Native sign-up failed:", error);
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }
}
