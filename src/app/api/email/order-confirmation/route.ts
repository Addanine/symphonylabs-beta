import { type NextRequest, NextResponse } from "next/server";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      email: string;
      orderId: string;
      orderNumber: string;
      totalAmount: number;
    };

    const { email, orderId, orderNumber, totalAmount } = body;

    if (!email || !orderId || !orderNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize Mailgun
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({
      username: "api",
      key: env.MAILGUN_API_KEY,
    });

    // Send email
    const emailData = {
      from: `Symphony Labs <noreply@${env.MAILGUN_DOMAIN}>`,
      to: email,
      subject: `Order Confirmation - ${orderNumber}`,
      text: `
Thank you for your order!

Order Details:
--------------
Order Number: ${orderNumber}
Order ID: ${orderId}
Total Amount: $${totalAmount.toFixed(2)}

Track Your Order:
You can track your order status at any time by visiting:
${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'https://symphonylabs.cc'}/track-order

Enter your Order ID: ${orderId}

Once your order ships, you'll be able to view tracking information.

Thank you for shopping with Symphony Labs!

--
Symphony Labs
questions? email jane@symphonylabs.cc
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; line-height: 1.6; color: #000; background: #fff; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border: 3px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #fff; }
    .content { border: 3px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #fff; }
    .footer { text-align: center; font-size: 12px; color: #666; }
    h1 { margin: 0 0 10px 0; font-size: 24px; }
    h2 { font-size: 18px; margin: 0 0 15px 0; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; }
    .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; margin: 10px 0; border: 3px solid #000; border-radius: 6px; font-weight: bold; }
    .button:hover { transform: translate(2px, 2px); }
    .order-id { background: #f5f5f5; padding: 15px; border: 2px solid #000; border-radius: 6px; font-family: monospace; margin: 10px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>[ ORDER CONFIRMED ]</h1>
      <p>Thank you for your purchase!</p>
    </div>

    <div class="content">
      <h2>Order Details</h2>
      <div class="detail">
        <span class="label">Order Number:</span> ${orderNumber}
      </div>
      <div class="detail">
        <span class="label">Total Amount:</span> $${totalAmount.toFixed(2)}
      </div>

      <hr style="border: 1px solid #000; margin: 20px 0;">

      <h2>Track Your Order</h2>
      <p>Save this Order ID to track your shipment:</p>
      <div class="order-id">
        ${orderId}
      </div>

      <a href="${process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : 'http://localhost:3000'}/track-order" class="button">
        Track Order →
      </a>

      <p style="font-size: 12px; color: #666;">
        Once your order ships, you'll be able to view tracking information on the order tracking page.
      </p>
    </div>

    <div class="footer">
      <p>Symphony Labs</p>
      <p>questions? email <a href="mailto:jane@symphonylabs.cc" style="color: #000; font-weight: bold;">jane@symphonylabs.cc</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    };

    await mg.messages.create(env.MAILGUN_DOMAIN, emailData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
