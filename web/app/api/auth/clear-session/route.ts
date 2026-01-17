import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  try {
    const response = await fetch(`${apiUrl}/api/auth/clear-session`, {
      redirect: "manual",
    });

    // Get the redirect location from the backend response
    const redirectLocation = response.headers.get("location") || "/login?cleared=true";

    // Create redirect response from www.kilnagent.com domain
    const redirectResponse = NextResponse.redirect(
      new URL(redirectLocation, process.env.NEXT_PUBLIC_CLIENT_URL || "http://localhost:3000")
    );

    // Forward all Set-Cookie headers from backend
    const setCookieHeaders = response.headers.get("set-cookie");
    if (setCookieHeaders) {
      redirectResponse.headers.set("Set-Cookie", setCookieHeaders);
    }

    return redirectResponse;
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.redirect("/login?error=clear_failed");
  }
}
