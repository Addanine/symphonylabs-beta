import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
import { rateLimiter, RateLimitPresets } from "~/lib/security/rate-limiter";
import { verifyAdminAuth } from "~/lib/security/jwt";
import {
  validateAndSanitize,
  productIdSchema,
} from "~/lib/security/input-validation";
import {
  logApiRequest,
  logValidationError,
  logRateLimitExceeded,
  logSecurityEvent,
  SecurityEventType,
} from "~/lib/security/logger";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientId = rateLimiter.getClientId(request);

  try {
    // Verify admin authentication
    const adminPayload = await verifyAdminAuth(request);

    if (!adminPayload) {
      logSecurityEvent(
        SecurityEventType.UNAUTHORIZED_ACCESS,
        "Unauthorized product visibility toggle attempt",
        { clientId, endpoint: "/api/products/toggle-visibility" }
      );
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Rate limiting - moderate for admin operations
    const rateLimit = rateLimiter.check(
      `admin:${adminPayload.username}`,
      RateLimitPresets.ADMIN
    );

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/products/toggle-visibility", clientId, RateLimitPresets.ADMIN.maxRequests);
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse request body
    const body = (await request.json().catch(() => null)) as unknown;

    if (!body || typeof body !== "object") {
      logValidationError("/api/products/toggle-visibility", clientId, "Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate and sanitize input
    const validation = validateAndSanitize(productIdSchema, body);

    if (!validation.success) {
      logValidationError("/api/products/toggle-visibility", clientId, validation.error, body);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { productId } = validation.data;

    // Get current product to check its hidden status
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("hidden")
      .eq("id", productId)
      .single();

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      logSecurityEvent(
        SecurityEventType.API_ERROR,
        "Failed to fetch product",
        { clientId, productId, error: fetchError.message }
      );
      return NextResponse.json(
        { error: "Failed to fetch product" },
        { status: 500 }
      );
    }

    // Toggle the hidden status
    const { error: updateError } = await supabase
      .from("products")
      .update({
        hidden: !product.hidden,
      })
      .eq("id", productId);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      logSecurityEvent(
        SecurityEventType.API_ERROR,
        "Failed to update product visibility",
        { clientId, productId, error: updateError.message }
      );
      return NextResponse.json(
        { error: "Failed to update product visibility" },
        { status: 500 }
      );
    }

    logApiRequest(
      "POST",
      "/api/products/toggle-visibility",
      clientId,
      200,
      Date.now() - startTime,
      { productId, newHiddenState: !product.hidden, admin: adminPayload.username }
    );

    return NextResponse.json({
      success: true,
      hidden: !product.hidden,
    });
  } catch (error) {
    console.error("Error toggling product visibility:", error);
    logSecurityEvent(
      SecurityEventType.API_ERROR,
      "Product visibility toggle error",
      {
        clientId,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
