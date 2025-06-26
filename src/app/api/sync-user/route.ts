import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!existingUser) {
      // Fetch user details from Clerk
      const clerkRes = await fetch(
        `https://api.clerk.com/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          },
        }
      );

      if (!clerkRes.ok) {
        throw new Error("Failed to fetch user from Clerk");
      }

      const clerkUser = await clerkRes.json();

      if (!clerkUser.email_addresses?.[0]?.email_address) {
        throw new Error("No email address found for user");
      }

      // Create new user
      await prisma.user.create({
        data: {
          clerkId: userId,
          username:
            clerkUser.username ||
            clerkUser.email_addresses[0].email_address.split("@")[0],
          email: clerkUser.email_addresses[0].email_address,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}