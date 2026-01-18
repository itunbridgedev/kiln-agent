import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Note: Middleware protection disabled because session cookies are set on api.kilnagent.com
  // and not accessible in middleware running on www.kilnagent.com
  // Access control is enforced in the admin page component itself
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
