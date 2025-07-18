import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Handle CORS preflight requests first
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Clerk-Auth',
      }
    });
  }

  // Process Clerk auth as before
  const authResult = await auth();
  const userId = authResult?.userId;

  // User sync logic (existing)
  if (userId && !isPublicRoute(req)) {
    try {
      const syncResponse = await fetch(
        `${req.nextUrl.origin}/api/sync-user?userId=${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!syncResponse.ok) {
        console.error("Failed to sync user:", await syncResponse.text());
      }
    } catch (error) {
      console.error("Error in middleware:", error);
    }
  }

  // Add CORS headers to all responses
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', corsOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Clerk-Auth');

  return response;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};