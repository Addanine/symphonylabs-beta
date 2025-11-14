import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { rateLimiter, RateLimitPresets } from "~/lib/security/rate-limiter";
import {
  validateAndSanitize,
  adminLoginSchema,
  containsSuspiciousPatterns,
} from "~/lib/security/input-validation";
import { generateAdminToken } from "~/lib/security/jwt";
import {
  logAuthSuccess,
  logAuthFailure,
  logRateLimitExceeded,
  logSuspiciousActivity,
  SecurityEventType,
} from "~/lib/security/logger";

export async function POST(request: NextRequest) {
  const clientId = rateLimiter.getClientId(request);

  try {
    // Rate limiting - strict for login attempts
    const rateLimit = rateLimiter.check(clientId, RateLimitPresets.LOGIN);

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/admin/login", clientId, RateLimitPresets.LOGIN.maxRequests);
      return NextResponse.json(
        {
          error: "Too many login attempts. Please try again later.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RateLimitPresets.LOGIN.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body = (await request.json().catch(() => null)) as unknown;

    if (!body || typeof body !== "object") {
      logAuthFailure("unknown", clientId, "Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate and sanitize input
    const validation = validateAndSanitize(adminLoginSchema, body);

    if (!validation.success) {
      const username = body && typeof body === "object" && "username" in body && typeof body.username === "string" ? body.username : "unknown";
      logAuthFailure(username, clientId, validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // Check for suspicious patterns
    if (containsSuspiciousPatterns(username) || containsSuspiciousPatterns(password)) {
      logSuspiciousActivity(
        SecurityEventType.SUSPICIOUS_INPUT,
        "Suspicious patterns detected in login attempt",
        clientId,
        { endpoint: "/api/admin/login" }
      );
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Constant-time comparison to prevent timing attacks
    const usernameMatch = username === env.ADMIN_USERNAME;
    const passwordMatch = password === env.ADMIN_PASSWORD;

    if (usernameMatch && passwordMatch) {
      // Generate secure JWT token
      const token = await generateAdminToken(username);

      logAuthSuccess(username, clientId);

      return NextResponse.json(
        {
          success: true,
          token,
          expiresIn: 28800, // 8 hours in seconds
        },
        {
          headers: {
            "X-RateLimit-Limit": RateLimitPresets.LOGIN.maxRequests.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          },
        }
      );
    }

    // Log failed authentication attempt
    logAuthFailure(username, clientId, "Invalid credentials");

    // Add artificial delay to prevent timing attacks
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return NextResponse.json(
      { error: "Invalid credentials" },
      {
        status: 401,
        headers: {
          "X-RateLimit-Limit": RateLimitPresets.LOGIN.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    logAuthFailure("unknown", clientId, "Internal server error");

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
