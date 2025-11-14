import { type NextRequest, NextResponse } from "next/server";
import https from "https";
import { env } from "~/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Create HTTPS agent that allows self-signed certificates in development
    const httpsAgent = env.BTCPAY_ALLOW_INSECURE === "true"
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    // Get invoice details from BTCPay Server API
    const response = await fetch(
      `${env.BTCPAY_HOST}/api/v1/stores/${env.BTCPAY_STORE_ID}/invoices/${invoiceId}`,
      {
        headers: {
          Authorization: `token ${env.BTCPAY_API_KEY}`,
        },
        // @ts-expect-error - agent is valid but not in Node fetch types
        agent: httpsAgent,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("BTCPay API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch invoice" },
        { status: response.status }
      );
    }

    const invoice = await response.json() as {
      id: string;
      status: string;
      amount: string;
      currency: string;
      createdTime: number;
      expirationTime: number;
      checkoutLink: string;
      metadata: Record<string, unknown>;
    };

    return NextResponse.json({
      id: invoice.id,
      status: invoice.status,
      amount: invoice.amount,
      currency: invoice.currency,
      createdTime: invoice.createdTime,
      expirationTime: invoice.expirationTime,
      checkoutLink: invoice.checkoutLink,
      metadata: invoice.metadata,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
