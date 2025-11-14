import { type NextRequest, NextResponse } from "next/server";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      email: string;
      orderNumber: string;
      trackingNumber: string;
      trackingUrl: string;
      shippingName: string;
    };

    const { email, orderNumber, trackingNumber, trackingUrl, shippingName } = body;

    if (!email || !orderNumber || !trackingNumber || !trackingUrl) {
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
      subject: `Your Order Has Shipped - ${orderNumber}`,
      text: `
Hi ${shippingName ?? 'there'},

Great news! Your order has been shipped!

Order Details:
--------------
Order Number: ${orderNumber}
Tracking Number: ${trackingNumber}

Track Your Shipment:
${trackingUrl}

You can use the tracking number above to monitor your package's journey. Depending on the carrier, it may take a few hours for tracking information to become available.

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
    .header { border: 3px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #000; color: #fff; }
    .content { border: 3px solid #000; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: #fff; }
    .footer { text-align: center; font-size: 12px; color: #666; }
    h1 { margin: 0 0 10px 0; font-size: 24px; }
    h2 { font-size: 18px; margin: 0 0 15px 0; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; }
    .tracking-box { background: #f5f5f5; padding: 15px; border: 2px solid #000; border-radius: 6px; font-family: monospace; margin: 15px 0; }
    .tracking-number { font-size: 18px; font-weight: bold; margin: 10px 0; }
    .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; margin: 10px 0; border: 3px solid #000; border-radius: 6px; font-weight: bold; }
    .button:hover { transform: translate(2px, 2px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>[ ORDER SHIPPED ]</h1>
      <p>Your package is on its way!</p>
    </div>

    <div class="content">
      <p>Hi ${shippingName ?? 'there'},</p>
      <p>Great news! Your order <strong>${orderNumber}</strong> has been shipped and is on its way to you.</p>

      <hr style="border: 1px solid #000; margin: 20px 0;">

      <h2>Tracking Information</h2>
      <div class="tracking-box">
        <div class="label">Tracking Number:</div>
        <div class="tracking-number">${trackingNumber}</div>
      </div>

      <a href="${trackingUrl}" class="button">
        Track Your Package →
      </a>

      <p style="font-size: 12px; color: #666; margin-top: 15px;">
        Note: It may take a few hours for tracking information to become available with the carrier.
      </p>
    </div>

    <div class="footer">
      <p>Thank you for shopping with Symphony Labs!</p>
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
    console.error("Error sending shipping notification email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
