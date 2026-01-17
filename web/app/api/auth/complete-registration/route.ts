import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

  try {
    const body = await request.json();

    const response = await fetch(`${apiUrl}/api/auth/complete-registration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error completing registration:", error);
    return NextResponse.json(
      { error: "Failed to complete registration" },
      { status: 500 }
    );
  }
}
