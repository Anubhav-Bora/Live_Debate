import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export async function ensureUserExists(clerkId: string): Promise<User> {
  console.log('👤 ensureUserExists - Starting for clerkId:', clerkId);
  
  // Validate input
  if (!clerkId || typeof clerkId !== 'string' || clerkId.trim().length === 0) {
    console.error('❌ ensureUserExists - Invalid clerkId provided:', { clerkId, type: typeof clerkId });
    throw new Error("Invalid clerkId provided");
  }
  
  try {
    // Check if user exists
    console.log('🔍 ensureUserExists - Checking if user exists in database');
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkId.trim() }
    });

    if (user) {
      console.log('✅ ensureUserExists - User found in database:', { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        clerkId: user.clerkId
      });
      
      // Validate user data integrity
      if (!user.id || !user.email || !user.username) {
        console.error('❌ ensureUserExists - User data is incomplete:', user);
        throw new Error("User data is incomplete in database");
      }
      
      return user;
    }

    console.log('🆕 ensureUserExists - User not found, fetching from Clerk API');
    
    // Validate environment variable
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('❌ ensureUserExists - CLERK_SECRET_KEY environment variable not set');
      throw new Error("CLERK_SECRET_KEY environment variable not set");
    }

    // Fetch user details from Clerk
    let clerkRes;
    try {
      const clerkUrl = `https://api.clerk.com/v1/users/${encodeURIComponent(clerkId.trim())}`;
      console.log('📡 ensureUserExists - Fetching from Clerk URL:', clerkUrl);
      
      clerkRes = await fetch(clerkUrl, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      console.log('📡 ensureUserExists - Clerk API response status:', clerkRes.status);
    } catch (fetchError) {
      console.error('❌ ensureUserExists - Network error fetching from Clerk:', fetchError);
      throw new Error(`Network error fetching user from Clerk: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    if (!clerkRes.ok) {
      const errorText = await clerkRes.text().catch(() => 'Unable to read error response');
      console.error('❌ ensureUserExists - Clerk API error:', {
        status: clerkRes.status,
        statusText: clerkRes.statusText,
        error: errorText,
        clerkId
      });
      
      if (clerkRes.status === 404) {
        throw new Error(`User not found in Clerk: ${clerkId}`);
      }
      if (clerkRes.status === 401) {
        throw new Error("Invalid Clerk API credentials");
      }
      
      throw new Error(`Failed to fetch user from Clerk: ${clerkRes.status} ${clerkRes.statusText}`);
    }

    let clerkUser;
    try {
      clerkUser = await clerkRes.json();
      console.log('📥 ensureUserExists - Clerk user data received:', {
        id: clerkUser.id,
        username: clerkUser.username,
        hasEmailAddresses: !!clerkUser.email_addresses,
        emailCount: clerkUser.email_addresses?.length || 0,
        primaryEmail: clerkUser.email_addresses?.[0]?.email_address
      });
    } catch (parseError) {
      console.error('❌ ensureUserExists - Error parsing Clerk API response:', parseError);
      throw new Error("Invalid response from Clerk API");
    }

    // Validate Clerk user data
    if (!clerkUser || !clerkUser.id) {
      console.error('❌ ensureUserExists - Invalid Clerk user data:', clerkUser);
      throw new Error("Invalid user data received from Clerk");
    }

    if (clerkUser.id !== clerkId.trim()) {
      console.error('❌ ensureUserExists - ClerkId mismatch:', {
        expected: clerkId.trim(),
        received: clerkUser.id
      });
      throw new Error("ClerkId mismatch in API response");
    }

    if (!clerkUser.email_addresses?.[0]?.email_address) {
      console.error('❌ ensureUserExists - No email address found in Clerk user data:', {
        emailAddresses: clerkUser.email_addresses,
        userId: clerkId
      });
      throw new Error("No email address found for user");
    }

    const email = clerkUser.email_addresses[0].email_address;
    const username = clerkUser.username || email.split("@")[0];
    
    // Validate extracted data
    if (!email || !username) {
      console.error('❌ ensureUserExists - Failed to extract valid email or username:', {
        email,
        username,
        clerkUser: clerkUser
      });
      throw new Error("Failed to extract valid user data from Clerk");
    }
    
    console.log('📝 ensureUserExists - Creating new user with data:', {
      clerkId: clerkId.trim(),
      username,
      email
    });

    // Create new user
    try {
      user = await prisma.user.create({
        data: {
          clerkId: clerkId.trim(),
          username,
          email,
        },
      });
      console.log('✅ ensureUserExists - User created successfully:', {
        id: user.id,
        username: user.username,
        email: user.email,
        clerkId: user.clerkId
      });
    } catch (dbError) {
      console.error('❌ ensureUserExists - Database error creating user:', {
        error: dbError instanceof Error ? dbError.stack || dbError.message : dbError,
        errorType: dbError?.constructor?.name || 'Unknown',
        userData: { clerkId: clerkId.trim(), username, email }
      });
      
      // Check if this is a unique constraint violation (user might have been created by another request)
      if (dbError instanceof Error && (dbError.message.includes('unique') || dbError.message.includes('duplicate'))) {
        console.log('🔄 ensureUserExists - Unique constraint violation, attempting to fetch existing user');
        const existingUser = await prisma.user.findUnique({
          where: { clerkId: clerkId.trim() }
        });
        if (existingUser) {
          console.log('✅ ensureUserExists - Found existing user after constraint violation:', {
            id: existingUser.id,
            username: existingUser.username,
            clerkId: existingUser.clerkId
          });
          return existingUser;
        }
      }
      
      throw new Error(`Database error creating user: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

    return user;
    
  } catch (error) {
    console.error('❌ ensureUserExists - Final error:', {
      error: error instanceof Error ? error.stack || error.message : error,
      errorType: error?.constructor?.name || 'Unknown',
      clerkId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}