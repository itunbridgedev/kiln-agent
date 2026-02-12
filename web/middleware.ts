import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // For API routes, add the original host header for backend tenant detection
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("X-Original-Host", request.headers.get("host") || "");

    return NextResponse.rewrite(request.nextUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Note: Middleware protection disabled for /admin because session cookies are set on api.kilnagent.com
  // and not accessible in middleware running on www.kilnagent.com
  // Access control is enforced in the admin page component itself
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/platform-admin/:path*"],
};
