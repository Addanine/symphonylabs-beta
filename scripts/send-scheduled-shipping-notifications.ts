#!/usr/bin/env tsx

/**
 * Cron job script to send scheduled shipping notification emails
 *
 * This script:
 * 1. Queries the database for orders with scheduled notification times that have passed
 * 2. Sends shipping notification emails for those orders
 * 3. Marks the notifications as sent
 *
 * Should be run via cron job (e.g., every hour)
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailgunDomain = process.env.MAILGUN_DOMAIN;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase environment variables');
  process.exit(1);
}

if (!mailgunApiKey || !mailgunDomain) {
  console.error('ERROR: Missing Mailgun environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Order {
  id: string;
  order_number: string;
  shipping_email: string | null;
  shipping_name: string;
  tracking_number: string;
  shipping_tracking_url: string;
  shipping_notification_scheduled_at: string;
}

async function sendShippingEmail(order: Order): Promise<boolean> {
  try {
    const formData = await import('form-data');
    const Mailgun = (await import('mailgun.js')).default;

    const mailgun = new Mailgun(formData.default);
    const mg = mailgun.client({
      username: 'api',
      key: mailgunApiKey!,
    });

    const emailData = {
      from: `Symphony Labs <noreply@${mailgunDomain}>`,
      to: order.shipping_email!,
      subject: `Your Order Has Shipped - ${order.order_number}`,
      text: `
Hi ${order.shipping_name ?? 'there'},

Great news! Your order has been shipped!

Order Details:
--------------
Order Number: ${order.order_number}
Tracking Number: ${order.tracking_number}

Track Your Shipment:
${order.shipping_tracking_url}

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
      <p>Hi ${order.shipping_name ?? 'there'},</p>
      <p>Great news! Your order <strong>${order.order_number}</strong> has been shipped and is on its way to you.</p>

      <hr style="border: 1px solid #000; margin: 20px 0;">

      <h2>Tracking Information</h2>
      <div class="tracking-box">
        <div class="label">Tracking Number:</div>
        <div class="tracking-number">${order.tracking_number}</div>
      </div>

      <a href="${order.shipping_tracking_url}" class="button">
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

    await mg.messages.create(mailgunDomain!, emailData);
    console.log(`✓ Sent shipping notification to ${order.shipping_email} for order ${order.order_number}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to send email for order ${order.order_number}:`, error);
    return false;
  }
}

async function processPendingNotifications() {
  try {
    const now = new Date().toISOString();

    console.log(`[${new Date().toISOString()}] Checking for pending shipping notifications...`);

    // Query orders with scheduled notifications that should be sent now
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, shipping_email, shipping_name, tracking_number, shipping_tracking_url, shipping_notification_scheduled_at')
      .not('shipping_notification_scheduled_at', 'is', null)
      .is('shipping_notification_sent_at', null)
      .lte('shipping_notification_scheduled_at', now)
      .not('shipping_email', 'is', null)
      .not('tracking_number', 'is', null)
      .not('shipping_tracking_url', 'is', null) as { data: Order[] | null; error: any };

    if (error) {
      console.error('Database query error:', error);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('No pending notifications to send');
      return;
    }

    console.log(`Found ${orders.length} notification(s) to send`);

    // Process each order
    for (const order of orders) {
      const emailSent = await sendShippingEmail(order);

      if (emailSent) {
        // Mark notification as sent
        const { error: updateError } = await supabase
          .from('orders')
          .update({ shipping_notification_sent_at: new Date().toISOString() })
          .eq('id', order.id);

        if (updateError) {
          console.error(`Failed to update order ${order.order_number}:`, updateError);
        } else {
          console.log(`✓ Marked notification as sent for order ${order.order_number}`);
        }
      }
    }

    console.log('Finished processing notifications');
  } catch (error) {
    console.error('Error processing notifications:', error);
    process.exit(1);
  }
}

// Run the script
processPendingNotifications()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
