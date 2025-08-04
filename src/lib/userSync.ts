import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function ensureUserExists(clerkId: string): Promise<User> {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { clerkId }
  });

  if (!user) {
    // Fetch user details from Clerk and create user
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!clerkRes.ok) {
      throw new Error("Failed to fetch user from Clerk");
    }

    const clerkUser = await clerkRes.json();

    if (!clerkUser.email_addresses?.[0]?.email_address) {
      throw new Error("No email address found for user");
    }

    // Create new user
    user = await prisma.user.create({
      data: {
        clerkId,
        username: clerkUser.username || clerkUser.email_addresses[0].email_address.split("@")[0],
        email: clerkUser.email_addresses[0].email_address,
      },
    });
  }

  return user;
}