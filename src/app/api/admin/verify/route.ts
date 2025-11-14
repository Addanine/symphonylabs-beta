import { type NextRequest, NextResponse } from "next/server";
import { rateLimiter, RateLimitPresets } from "~/lib/security/rate-limiter";
import { verifyAdminToken } from "~/lib/security/jwt";
import {
  logSecurityEvent,
  SecurityEventType,
  logRateLimitExceeded,
} from "~/lib/security/logger";

export async function POST(request: NextRequest) {
  const clientId = rateLimiter.getClientId(request);

  try {
    // Rate limiting - moderate for verify endpoint
    const rateLimit = rateLimiter.check(clientId, RateLimitPresets.API);

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/admin/verify", clientId, RateLimitPresets.API.maxRequests);
      return NextResponse.json(
        { valid: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    const body = (await request.json().catch(() => null)) as unknown;

    if (!body || typeof body !== "object" || !("token" in body) || typeof body.token !== "string") {
      return NextResponse.json(
        { valid: false },
        { status: 401 }
      );
    }

    const { token } = body;

    // Verify JWT token
    const payload = await verifyAdminToken(token);

    if (payload) {
      return NextResponse.json({
        valid: true,
        username: payload.username,
        expiresAt: payload.exp,
      });
    }

    // Log invalid token attempt
    logSecurityEvent(
      SecurityEventType.INVALID_TOKEN,
      "Invalid admin token verification attempt",
      { clientId, endpoint: "/api/admin/verify" }
    );

    return NextResponse.json(
      { valid: false },
      { status: 401 }
    );
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { valid: false },
      { status: 500 }
    );
  }
}
