import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { generateAdminToken } from "~/lib/security/jwt";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json().catch(() => null)) as unknown;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Check if password is provided
    if (!("password" in body) || typeof body.password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const { password } = body as { password: string };

    // Verify password
    if (password !== env.ADMIN_PASSWORD) {
      // Add artificial delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    // Generate JWT token (using admin username for consistency)
    const token = await generateAdminToken(env.ADMIN_USERNAME);

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
    });

    // Set secure HTTP-only cookie
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 28800, // 8 hours in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
