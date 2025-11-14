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

    // Get payment methods for the invoice
    const response = await fetch(
      `${env.BTCPAY_HOST}/api/v1/stores/${env.BTCPAY_STORE_ID}/invoices/${invoiceId}/payment-methods`,
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
        { error: "Failed to fetch payment methods" },
        { status: response.status }
      );
    }

    const paymentMethods = await response.json() as Array<{
      paymentMethod: string;
      cryptoCode: string;
      destination: string;
      paymentLink: string;
      rate: string;
      totalPaid: string;
      due: string;
      amount: string;
      networkFee: string;
    }>;

    return NextResponse.json(paymentMethods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
