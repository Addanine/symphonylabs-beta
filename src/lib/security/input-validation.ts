/**
 * Input Validation and Sanitization Utilities
 *
 * Provides comprehensive input validation and sanitization to prevent
 * XSS, injection attacks, and data corruption.
 */

import { z } from "zod";

/**
 * Sanitize string input by removing potentially dangerous characters
 * and limiting length
 */
export function sanitizeString(
  input: string,
  maxLength = 1000
): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize HTML input by escaping dangerous characters
 * For rich text, use DOMPurify on the client side
 */
export function escapeHtml(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  const htmlEscapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] ?? char);
}

/**
 * Validate and sanitize email address
 */
export const emailSchema = z
  .string()
  .email("Invalid email address")
  .min(3, "Email too short")
  .max(254, "Email too long") // RFC 5321
  .transform((email) => email.toLowerCase().trim());

/**
 * Validate and sanitize phone number
 * Allows international formats
 */
export const phoneSchema = z
  .string()
  .min(7, "Phone number too short")
  .max(20, "Phone number too long")
  .regex(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    "Invalid phone number format"
  )
  .transform((phone) => phone.trim());

/**
 * Validate and sanitize shipping address
 */
export const shippingAddressSchema = z.object({
  name: z
    .string()
    .min(2, "Name too short")
    .max(100, "Name too long")
    .transform((name) => sanitizeString(name, 100)),
  email: emailSchema.optional().or(z.literal("")),
  addressLine1: z
    .string()
    .min(5, "Address too short")
    .max(200, "Address too long")
    .transform((addr) => sanitizeString(addr, 200)),
  addressLine2: z
    .string()
    .max(200, "Address too long")
    .optional()
    .transform((addr) => (addr ? sanitizeString(addr, 200) : "")),
  city: z
    .string()
    .min(2, "City too short")
    .max(100, "City too long")
    .transform((city) => sanitizeString(city, 100)),
  state: z
    .string()
    .min(2, "State too short")
    .max(100, "State too long")
    .transform((state) => sanitizeString(state, 100)),
  zip: z
    .string()
    .min(3, "ZIP code too short")
    .max(20, "ZIP code too long")
    .transform((zip) => sanitizeString(zip, 20)),
  country: z
    .string()
    .min(2, "Country too short")
    .max(100, "Country too long")
    .transform((country) => sanitizeString(country, 100)),
  phone: phoneSchema.optional().or(z.literal("")),
});

/**
 * Validate selected modifier
 */
export const selectedModifierSchema = z.object({
  groupId: z.string().min(1, "Group ID required"),
  groupLabel: z.string().min(1, "Group label required"),
  optionId: z.string().min(1, "Option ID required"),
  optionLabel: z.string().min(1, "Option label required"),
  priceAdjustment: z
    .number()
    .finite("Price adjustment must be finite")
    .max(100000, "Price adjustment too high")
    .min(-100000, "Price adjustment too low"),
});

/**
 * Validate order items
 */
export const orderItemSchema = z.object({
  id: z.string().uuid("Invalid product ID"),
  name: z
    .string()
    .min(1, "Product name required")
    .max(200, "Product name too long")
    .transform((name) => sanitizeString(name, 200)),
  price: z
    .number()
    .positive("Price must be positive")
    .finite("Price must be finite")
    .max(1000000, "Price too high"),
  quantity: z
    .number()
    .int("Quantity must be integer")
    .positive("Quantity must be positive")
    .max(1000, "Quantity too high"),
  originalPrice: z
    .number()
    .positive("Original price must be positive")
    .finite("Original price must be finite")
    .max(1000000, "Original price too high")
    .optional(),
  discount: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .optional(),
  selectedModifiers: z.array(selectedModifierSchema).optional(),
});

/**
 * Validate order creation request
 */
export const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item required")
    .max(50, "Too many items"),
  totalAmount: z
    .number()
    .positive("Total must be positive")
    .finite("Total must be finite")
    .max(1000000, "Total too high"),
  shippingAddress: shippingAddressSchema,
  shippingCost: z
    .number()
    .nonnegative("Shipping cost cannot be negative")
    .max(10000, "Shipping cost too high")
    .optional(),
  subtotal: z
    .number()
    .positive("Subtotal must be positive")
    .finite("Subtotal must be finite")
    .max(1000000, "Subtotal too high")
    .optional(),
  couponCode: z
    .string()
    .max(50, "Coupon code too long")
    .optional(),
  couponDiscount: z
    .number()
    .nonnegative("Coupon discount cannot be negative")
    .max(1000000, "Coupon discount too high")
    .optional(),
});

/**
 * Validate BTCPay invoice creation
 */
export const createInvoiceSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .finite("Amount must be finite")
    .max(1000000, "Amount too high"),
  currency: z
    .string()
    .length(3, "Currency must be 3 characters")
    .regex(/^[A-Z]{3}$/, "Invalid currency format")
    .transform((curr) => curr.toUpperCase()),
  orderId: z.string().uuid("Invalid order ID"),
  buyerEmail: emailSchema.optional(),
  preferredCrypto: z.enum(["bitcoin", "monero"]).optional(),
});

/**
 * Validate admin login
 */
export const adminLoginSchema = z.object({
  username: z
    .string()
    .min(3, "Username too short")
    .max(50, "Username too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .transform((username) => username.trim()),
  password: z
    .string()
    .min(8, "Password too short")
    .max(200, "Password too long"),
});

/**
 * Validate product ID
 */
export const productIdSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
});

/**
 * Validate UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * SQL-safe string - additional protection layer
 * Supabase already uses parameterized queries, but this provides defense in depth
 */
export function sanitizeSQLString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove common SQL injection patterns
  const dangerous = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(;|--|\/\*|\*\/|xp_|sp_)/gi,
    /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
  ];

  let sanitized = input;
  for (const pattern of dangerous) {
    sanitized = sanitized.replace(pattern, "");
  }

  return sanitized.trim();
}

/**
 * Check for suspicious patterns in input
 */
export function containsSuspiciousPatterns(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /data:text\/html/i,
    /vbscript:/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /eval\(/i,
    /expression\(/i,
    /import\s*\(/i,
    /document\./i,
    /window\./i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Validate and sanitize any user input
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message ?? "Validation failed",
      };
    }
    return { success: false, error: "Invalid input" };
  }
}
