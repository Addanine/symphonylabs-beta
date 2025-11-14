import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export interface ModifierOption {
  id: string;
  label: string;
  priceAdjustment: number; // Can be positive or negative
  dependsOn?: {
    groupId: string;
    optionId: string;
  }; // Optional: only show if this option is selected
}

export interface ModifierGroup {
  id: string;
  label: string;
  required: boolean;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discount?: number; // Percentage discount (0-100)
  description: string;
  short_description?: string;
  image: string; // Main product image (for backward compatibility)
  images?: string[]; // Array of all product images for carousel
  modifiers?: ModifierGroup[]; // Product customization options
  hidden: boolean;
  stock: number;
  created_at: string;
  updated_at: string;
}

// Helper function to calculate final price with discount
export const calculateDiscountedPrice = (price: number, discount?: number): number => {
  if (!discount || discount <= 0) return price;
  const discountAmount = (price * discount) / 100;
  return price - discountAmount;
};

// Helper function to check if product has active discount
export const hasDiscount = (product: Product): boolean => {
  return !!(product.discount && product.discount > 0);
};

export interface LabTest {
  id: string;
  product_id: string;
  batch: string;
  purity: string;
  link: string;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount?: number;
  max_uses?: number;
  current_uses: number;
  one_per_customer: boolean;
  valid_from: string;
  valid_until?: string;
  active: boolean;
  applicable_to: "all" | "specific";
  product_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  customer_email: string;
  used_at: string;
  order_id?: string;
}

// Helper function to validate and calculate coupon discount
export const validateCoupon = (
  coupon: Coupon,
  orderTotal: number,
  customerEmail?: string,
  cartProductIds?: string[]
): { valid: boolean; error?: string; discount?: number } => {
  // Check if coupon is active
  if (!coupon.active) {
    return { valid: false, error: "This coupon is not active" };
  }

  // Check if coupon has started
  const now = new Date();
  const validFrom = new Date(coupon.valid_from);
  if (now < validFrom) {
    return { valid: false, error: "This coupon is not yet valid" };
  }

  // Check if coupon has expired
  if (coupon.valid_until) {
    const validUntil = new Date(coupon.valid_until);
    if (now > validUntil) {
      return { valid: false, error: "This coupon has expired" };
    }
  }

  // Check if coupon has reached max uses
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return { valid: false, error: "This coupon has reached its usage limit" };
  }

  // Check minimum order amount
  if (coupon.minimum_order_amount && orderTotal < coupon.minimum_order_amount) {
    return {
      valid: false,
      error: `Minimum order amount of $${coupon.minimum_order_amount.toFixed(2)} required`,
    };
  }

  // Check product applicability
  if (coupon.applicable_to === "specific" && coupon.product_ids && cartProductIds) {
    const hasApplicableProduct = cartProductIds.some((id) =>
      coupon.product_ids?.includes(id)
    );
    if (!hasApplicableProduct) {
      return { valid: false, error: "This coupon is not applicable to items in your cart" };
    }
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discount_type === "percentage") {
    discount = (orderTotal * coupon.discount_value) / 100;
  } else {
    discount = coupon.discount_value;
  }

  // Ensure discount doesn't exceed order total
  discount = Math.min(discount, orderTotal);

  return { valid: true, discount };
};
