import { NextResponse, type NextRequest } from "next/server";
import { supabase, validateCoupon, type Coupon } from "~/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      code: string;
      orderTotal: number;
      customerEmail?: string;
      cartProductIds?: string[];
    };

    const { code, orderTotal, customerEmail, cartProductIds } = body;

    if (!code || !orderTotal) {
      return NextResponse.json(
        { error: "Coupon code and order total are required" },
        { status: 400 }
      );
    }

    // Fetch coupon from database
    const result = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .single();

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: "Invalid coupon code" },
        { status: 404 }
      );
    }

    const coupon = result.data as Coupon;

    // Check if customer has already used this coupon (if one_per_customer is enabled)
    if (coupon.one_per_customer && customerEmail) {
      const usageResult = await supabase
        .from("coupon_usage")
        .select("*")
        .eq("coupon_id", coupon.id)
        .eq("customer_email", customerEmail)
        .single();

      if (usageResult.data) {
        return NextResponse.json(
          { error: "You have already used this coupon" },
          { status: 400 }
        );
      }
    }

    // Validate coupon
    const validation = validateCoupon(
      coupon,
      orderTotal,
      customerEmail,
      cartProductIds
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount: validation.discount,
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
