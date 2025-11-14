-- Migration: Add product images array and stock management
-- This migration adds support for multiple product images (carousel) and stock tracking
-- Run this in your Supabase SQL Editor

-- Add images column to products table (array of text for image URLs)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS images TEXT[];

-- Add short_description column if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS short_description TEXT;

-- Add stock column if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;

-- Update existing products to have an empty images array if null
UPDATE products
SET images = ARRAY[]::TEXT[]
WHERE images IS NULL;

-- Optional: Migrate existing image field to images array for existing products
-- This will add the current single image to the images array
UPDATE products
SET images = ARRAY[image]::TEXT[]
WHERE images = ARRAY[]::TEXT[] OR images IS NULL;

-- Add comment to document the new columns
COMMENT ON COLUMN products.images IS 'Array of product image URLs for carousel display';
COMMENT ON COLUMN products.short_description IS 'Brief product description shown on product cards';
COMMENT ON COLUMN products.stock IS 'Current stock quantity for inventory management';

-- Verify the changes
SELECT
  id,
  name,
  image,
  images,
  stock,
  short_description
FROM products
LIMIT 5;
