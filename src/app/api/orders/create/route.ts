import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "~/lib/supabase";
import { rateLimiter, RateLimitPresets } from "~/lib/security/rate-limiter";
import {
  validateAndSanitize,
  createOrderSchema,
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
    // Rate limiting - prevent order spam
    const rateLimit = rateLimiter.check(clientId, RateLimitPresets.ORDER_CREATE);

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/orders/create", clientId, RateLimitPresets.ORDER_CREATE.maxRequests);
      return NextResponse.json(
        {
          error: "Too many order creation attempts. Please wait before trying again.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": RateLimitPresets.ORDER_CREATE.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Parse request body
    const body = (await request.json().catch(() => null)) as unknown;

    if (!body || typeof body !== "object") {
      logValidationError("/api/orders/create", clientId, "Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate and sanitize input
    const validation = validateAndSanitize(createOrderSchema, body);

    if (!validation.success) {
      logValidationError("/api/orders/create", clientId, validation.error, body);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { items, totalAmount, shippingAddress, shippingCost, couponCode, couponDiscount } = validation.data;

    // Check stock availability for all items
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.id)
        .single();

      if (productError || !product) {
        logSecurityEvent(
          SecurityEventType.SUSPICIOUS_INPUT,
          "Order contains non-existent product",
          {
            clientId,
            productId: item.id,
          }
        );
        return NextResponse.json(
          { error: `Product ${item.name} not found` },
          { status: 400 }
        );
      }

      interface ProductStock {
        stock: number;
      }

      const productStock = product as ProductStock;

      if (productStock.stock < item.quantity) {
        logSecurityEvent(
          SecurityEventType.SUSPICIOUS_INPUT,
          "Insufficient stock for order",
          {
            clientId,
            productId: item.id,
            requestedQuantity: item.quantity,
            availableStock: productStock.stock,
          }
        );
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.name}. Only ${productStock.stock} available.`,
            insufficientStock: true,
            productName: item.name,
            availableStock: productStock.stock,
          },
          { status: 400 }
        );
      }
    }

    // Additional business logic validation
    // Verify total amount matches sum of items (including modifiers) + shipping - coupon discount
    const calculatedSubtotal = items.reduce(
      (sum, item) => {
        // Calculate modifier price adjustments
        const modifierTotal = item.selectedModifiers?.reduce(
          (modSum, mod) => modSum + mod.priceAdjustment,
          0
        ) ?? 0;

        // Item total = (base price + modifiers) * quantity
        return sum + (item.price + modifierTotal) * item.quantity;
      },
      0
    );
    const calculatedTotal = calculatedSubtotal + (shippingCost ?? 0) - (couponDiscount ?? 0);

    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      logSecurityEvent(
        SecurityEventType.SUSPICIOUS_INPUT,
        "Order total mismatch detected",
        {
          clientId,
          endpoint: "/api/orders/create",
          calculatedTotal,
          providedTotal: totalAmount,
          couponDiscount,
        }
      );
      return NextResponse.json(
        { error: "Order total validation failed" },
        { status: 400 }
      );
    }

    // Generate secure order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Create order in Supabase
    const result = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,
          payment_method: "btcpay", // Explicitly set payment method for BTCPay orders
          status: "pending",
          total_amount: totalAmount,
          items: items,
          shipping_name: shippingAddress.name,
          shipping_email: shippingAddress.email,
          shipping_address_line1: shippingAddress.addressLine1,
          shipping_address_line2: shippingAddress.addressLine2,
          shipping_city: shippingAddress.city,
          shipping_state: shippingAddress.state,
          shipping_zip: shippingAddress.zip,
          shipping_country: shippingAddress.country,
          shipping_phone: shippingAddress.phone,
          shipping_cost: shippingCost,
          coupon_code: couponCode,
          coupon_discount: couponDiscount,
        },
      ])
      .select()
      .single();

    if (result.error || !result.data) {
      console.error("Supabase error:", result.error);
      logSecurityEvent(
        SecurityEventType.API_ERROR,
        "Failed to create order in database",
        {
          clientId,
          error: result.error?.message,
        }
      );
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    interface OrderData {
      id: string;
      order_number: string;
    }

    const data = result.data as OrderData;

    logApiRequest(
      "POST",
      "/api/orders/create",
      clientId,
      200,
      Date.now() - startTime,
      { orderId: data.id }
    );

    return NextResponse.json(
      {
        orderId: data.id,
        orderNumber: data.order_number,
      },
      {
        headers: {
          "X-RateLimit-Limit": RateLimitPresets.ORDER_CREATE.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    logSecurityEvent(
      SecurityEventType.API_ERROR,
      "Order creation error",
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
