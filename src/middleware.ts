import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && MUTATING_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host");
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
    let originMatches = true;
    if (origin) {
      try {
        const parsedOrigin = new URL(origin);
        originMatches = parsedOrigin.host === requestHost && parsedOrigin.protocol === `${requestProtocol}:`;
      } catch {
        originMatches = false;
      }
    }
    if (!originMatches || fetchSite === "cross-site") {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  response.headers.set("X-Frame-Options", "DENY");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
