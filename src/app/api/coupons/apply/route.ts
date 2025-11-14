import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "~/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      couponId: string;
      customerEmail: string;
      orderId: string;
    };

    const { couponId, customerEmail, orderId } = body;

    if (!couponId || !customerEmail || !orderId) {
      return NextResponse.json(
        { error: "Coupon ID, customer email, and order ID are required" },
        { status: 400 }
      );
    }

    // Increment coupon usage count
    const { error: updateError } = await supabase.rpc("increment_coupon_uses", {
      coupon_id: couponId,
    });

    // If the RPC doesn't exist, use a manual update
    if (updateError) {
      const result = await supabase
        .from("coupons")
        .select("current_uses")
        .eq("id", couponId)
        .single();

      if (result.data) {
        const couponData = result.data as { current_uses: number };
        await supabase
          .from("coupons")
          .update({ current_uses: couponData.current_uses + 1 })
          .eq("id", couponId);
      }
    }

    // Record coupon usage
    const { error: usageError } = await supabase
      .from("coupon_usage")
      .insert([
        {
          coupon_id: couponId,
          customer_email: customerEmail,
          order_id: orderId,
        },
      ]);

    if (usageError) {
      console.error("Error recording coupon usage:", usageError);
      // Don't fail the request if usage recording fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error applying coupon:", error);
    return NextResponse.json(
      { error: "Failed to apply coupon" },
      { status: 500 }
    );
  }
}
