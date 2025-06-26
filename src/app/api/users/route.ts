import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (existingUser) {
      return NextResponse.json({ user: existingUser });
    }

    // If user doesn't exist, create them
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!clerkRes.ok) {
      throw new Error("Failed to fetch user from Clerk");
    }

    const clerkUser = await clerkRes.json();

    const newUser = await prisma.user.create({
      data: {
        clerkId: userId,
        username: clerkUser.username || clerkUser.email_addresses[0].email_address.split("@")[0],
        email: clerkUser.email_addresses[0].email_address,
      },
    });

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}