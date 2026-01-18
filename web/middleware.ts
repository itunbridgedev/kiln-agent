import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only apply to admin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Check if user is authenticated by looking for session cookie
    const sessionCookie = request.cookies.get("connect.sid");

    if (!sessionCookie) {
      // No session cookie - redirect to login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Session exists - allow access (role check happens in the page component)
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
