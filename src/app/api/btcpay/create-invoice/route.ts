import { type NextRequest, NextResponse } from "next/server";
import https from "https";
import { env } from "~/env";
import { rateLimiter, RateLimitPresets } from "~/lib/security/rate-limiter";
import {
  validateAndSanitize,
  createInvoiceSchema,
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
    // Rate limiting - moderate for invoice creation
    const rateLimit = rateLimiter.check(clientId, RateLimitPresets.ORDER_CREATE);

    if (!rateLimit.isAllowed) {
      logRateLimitExceeded("/api/btcpay/create-invoice", clientId, RateLimitPresets.ORDER_CREATE.maxRequests);
      return NextResponse.json(
        {
          error: "Too many invoice creation attempts. Please wait before trying again.",
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
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
      logValidationError("/api/btcpay/create-invoice", clientId, "Invalid JSON body");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate and sanitize input
    const validation = validateAndSanitize(createInvoiceSchema, body);

    if (!validation.success) {
      logValidationError("/api/btcpay/create-invoice", clientId, validation.error, body);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { amount, currency, orderId, buyerEmail, preferredCrypto } = validation.data;

    // Determine payment methods based on user preference
    let paymentMethods: string[];
    if (preferredCrypto === "monero") {
      paymentMethods = ["XMR"];
    } else if (preferredCrypto === "bitcoin") {
      paymentMethods = ["BTC"];
    } else {
      // Default: offer all payment methods
      paymentMethods = ["BTC", "XMR"];
    }

    // Create HTTPS agent that allows self-signed certificates in development
    const httpsAgent = env.BTCPAY_ALLOW_INSECURE === "true"
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    // Create invoice using BTCPay Server API
    const response = await fetch(
      `${env.BTCPAY_HOST}/api/v1/stores/${env.BTCPAY_STORE_ID}/invoices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${env.BTCPAY_API_KEY}`,
        },
        body: JSON.stringify({
          amount: amount.toString(),
          currency,
          metadata: {
            orderId,
            buyerEmail,
          },
          checkout: {
            speedPolicy: "HighSpeed",
            paymentMethods,
            expirationMinutes: 60,
          },
        }),
        // @ts-expect-error - agent is valid but not in Node fetch types
        agent: httpsAgent,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("BTCPay API error:", errorText);

      // Parse BTCPay error response to provide more helpful error messages
      let errorMessage = "Failed to create invoice";
      try {
        const errorJson = JSON.parse(errorText) as { message?: string; code?: string };
        if (errorJson.message?.includes("Payment method unavailable")) {
          errorMessage = "The requested payment method is currently unavailable. Please try a different payment option.";
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // If error text is not JSON, keep default message
      }

      logSecurityEvent(
        SecurityEventType.API_ERROR,
        "BTCPay invoice creation failed",
        {
          clientId,
          status: response.status,
          orderId,
          error: errorText.substring(0, 200), // Log first 200 chars of error
        }
      );
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const invoice = await response.json() as {
      id: string;
      checkoutLink: string;
      amount: string;
      currency: string;
      status: string;
    };

    logApiRequest(
      "POST",
      "/api/btcpay/create-invoice",
      clientId,
      200,
      Date.now() - startTime,
      { invoiceId: invoice.id, orderId }
    );

    return NextResponse.json(
      {
        invoiceId: invoice.id,
        checkoutLink: invoice.checkoutLink,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
      },
      {
        headers: {
          "X-RateLimit-Limit": RateLimitPresets.ORDER_CREATE.maxRequests.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    logSecurityEvent(
      SecurityEventType.API_ERROR,
      "Invoice creation error",
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
