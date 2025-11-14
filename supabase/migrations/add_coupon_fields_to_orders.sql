-- Add coupon fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2);
