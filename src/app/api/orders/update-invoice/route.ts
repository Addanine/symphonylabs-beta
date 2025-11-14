import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
import { rateLimiter, RateLimitPresets } from "~/lib/security/rate-limiter";
import {
  logApiRequest,
  logValidationError,
  logRateLimitExceeded,
  logSecurityEvent,
  SecurityEventType,
} from "~/lib/security/logger";
import { z } from "zod";

const updateInvoiceSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  invoiceId: z.string().min(1, "Invoice ID required").max(200, "Invoice ID too long"),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientId = rateLimiter.getClientId(request);

  try {
    // Rate limiting
    const rateLimit = rateLimiter.check(clientId, RateLimitPresets.API);

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/orders/update-invoice", clientId, RateLimitPresets.API.maxRequests);
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
      logValidationError("/api/orders/update-invoice", clientId, "Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate input
    const validation = updateInvoiceSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.errors[0]?.message ?? "Validation failed";
      logValidationError("/api/orders/update-invoice", clientId, error, body);
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    const { orderId, invoiceId } = validation.data;

    // Update order with invoice ID
    const { error } = await supabase
      .from("orders")
      .update({ btcpay_invoice_id: invoiceId })
      .eq("id", orderId);

    if (error) {
      console.error("Supabase error:", error);
      logSecurityEvent(
        SecurityEventType.API_ERROR,
        "Failed to update order with invoice",
        { clientId, orderId, error: error.message }
      );
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    logApiRequest(
      "POST",
      "/api/orders/update-invoice",
      clientId,
      200,
      Date.now() - startTime,
      { orderId, invoiceId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    logSecurityEvent(
      SecurityEventType.API_ERROR,
      "Order update error",
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
