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

const markPaidSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientId = rateLimiter.getClientId(request);

  try {
    // Rate limiting - moderate to prevent abuse
    const rateLimit = rateLimiter.check(clientId, RateLimitPresets.API);

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/orders/mark-paid", clientId, RateLimitPresets.API.maxRequests);
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
      logValidationError("/api/orders/mark-paid", clientId, "Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate input
    const validation = markPaidSchema.safeParse(body);

    if (!validation.success) {
      const error = validation.error.errors[0]?.message ?? "Validation failed";
      logValidationError("/api/orders/mark-paid", clientId, error, body);
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    const { orderId } = validation.data;

    // Verify order exists and is in correct state
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status, btcpay_invoice_id, items")
      .eq("id", orderId)
      .single();

    if (fetchError || !existingOrder) {
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_INPUT,
        "Attempt to mark non-existent order as paid",
        { clientId, orderId }
      );
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order is already paid
    if (existingOrder.status === "paid") {
      return NextResponse.json(
        { success: true, message: "Order already marked as paid" }
      );
    }

    // Decrement stock for each item in the order
    interface OrderItem {
      id: string;
      quantity: number;
      name: string;
    }

    const items = existingOrder.items as OrderItem[];

    for (const item of items) {
      // Get current stock
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.id)
        .single();

      if (productError || !product) {
        console.error("Product not found for stock decrement:", item.id);
        logSecurityEvent(
          SecurityEventType.API_ERROR,
          "Product not found during stock decrement",
          { clientId, orderId, productId: item.id }
        );
        // Continue processing other items even if one fails
        continue;
      }

      // Calculate new stock (ensure it doesn't go below 0)
      const newStock = Math.max(0, product.stock - item.quantity);

      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", item.id);

      if (updateError) {
        console.error("Failed to update stock:", updateError);
        logSecurityEvent(
          SecurityEventType.API_ERROR,
          "Failed to decrement stock",
          { clientId, orderId, productId: item.id, error: updateError.message }
        );
        // Continue processing other items even if one fails
      }
    }

    // Update order status to paid
    const { error } = await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (error) {
      console.error("Supabase error:", error);
      logSecurityEvent(
        SecurityEventType.API_ERROR,
        "Failed to mark order as paid",
        { clientId, orderId, error: error.message }
      );
      return NextResponse.json(
        { error: "Failed to update order" },
        { status: 500 }
      );
    }

    logApiRequest(
      "POST",
      "/api/orders/mark-paid",
      clientId,
      200,
      Date.now() - startTime,
      { orderId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking order as paid:", error);
    logSecurityEvent(
      SecurityEventType.API_ERROR,
      "Mark order paid error",
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
